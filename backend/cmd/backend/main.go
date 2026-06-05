package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"google.golang.org/grpc"

	"prosper/auth"
	"prosper/config"
	"prosper/db"
	prosperv1 "prosper/gen/prosper/v1"
	"prosper/ledger"
	"prosper/openbanking"
	"prosper/openbanking/gocardless"
	"prosper/openbanking/starling"
	"prosper/openbanking/truelayer"
	"prosper/rates"
	"prosper/userdb"
)

func main() {
	cfg := config.MustLoad()

	// Install the signal handler before migrations,
	// so if the app is killed during the migration the in-flight DDL is cancelled.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	conn, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer conn.Close()
	if err := db.Migrate(ctx, conn); err != nil {
		log.Fatalf("db migrate: %v", err)
	}
	// DB wrapper for user-scoped queries.
	udb := userdb.New(conn)

	// Best-effort cleanup of any stale socket file from a prior crash.
	_ = os.Remove(cfg.GRPCSocketPath)

	listener, err := net.Listen("unix", cfg.GRPCSocketPath)
	if err != nil {
		log.Fatalf("listen unix: %v", err)
	}
	// Tighten the socket to owner-only rw: the Node frontend runs as the
	// same user, so nothing else needs access. The default permissions
	// applied by net.Listen depend on umask, so set this explicitly.
	if err := os.Chmod(cfg.GRPCSocketPath, 0o600); err != nil {
		log.Printf("chmod socket: %v", err)
	}

	// bg tracks every background goroutine (schedulers, sweepers) so
	// main can wait for them to finish before the deferred DB close
	// pulls the connection pool out from under them.
	var bg sync.WaitGroup

	// authSrv is constructed against the raw *sqlx.DB rather than the
	// userdb wrapper because its queries (session lookup, login,
	// registration) run before a userID exists in the request context.
	// Every other service is built on udb to enforce user-scoped access.
	authSrv := auth.NewService(conn)
	grpcSrv := grpc.NewServer(
		// auth.UnaryServerInterceptor inspects session-id metadata and
		// stamps the resolved userID into the context for handlers.
		grpc.UnaryInterceptor(auth.UnaryServerInterceptor(authSrv)),
	)
	prosperv1.RegisterAuthServiceServer(grpcSrv, authSrv)

	ratesSrv := rates.NewService(conn, cfg)
	prosperv1.RegisterRatesServiceServer(grpcSrv, ratesSrv)
	stockResolver := rates.NewStockResolver(conn, rates.NewYahooProvider())

	obSrv := openbanking.NewService(udb, cfg.OpenBankingRefreshInterval)
	if cfg.TrueLayerClientID != "" && cfg.TrueLayerClientSecret != "" {
		obSrv.RegisterProvider(truelayer.New(udb, cfg.TrueLayerClientID, cfg.TrueLayerClientSecret, cfg.PublicAppURL))
		log.Println("openbanking: truelayer provider registered")
	} else {
		log.Println("openbanking: truelayer provider disabled (credentials not configured)")
	}
	if cfg.GoCardlessSecretID != "" && cfg.GoCardlessSecretKey != "" {
		obSrv.RegisterProvider(gocardless.New(udb, cfg.GoCardlessSecretID, cfg.GoCardlessSecretKey, cfg.PublicAppURL))
		log.Println("openbanking: gocardless provider registered")
	} else {
		log.Println("openbanking: gocardless provider disabled (credentials not configured)")
	}
	obSrv.RegisterProvider(starling.New(udb))
	log.Println("openbanking: starling provider registered")
	prosperv1.RegisterOpenBankingServiceServer(grpcSrv, obSrv)

	ledgerSrv := ledger.NewService(udb, ratesSrv, stockResolver)
	prosperv1.RegisterLedgerServiceServer(grpcSrv, ledgerSrv)

	// Start background services.
	authSrv.StartExpiredSessionSweeper(ctx, &bg)
	ratesSrv.StartScheduler(ctx, &bg)
	obSrv.StartScheduler(ctx, &bg)

	go func() {
		<-ctx.Done()
		log.Println("shutdown signal received")
		grpcSrv.GracefulStop()
	}()

	log.Printf("gRPC listening on %s", cfg.GRPCSocketPath)
	if err := grpcSrv.Serve(listener); err != nil {
		log.Fatalf("serve: %v", err)
	}
	// GracefulStop only blocks on in-flight RPCs; background goroutines
	// (schedulers, session sweeper) shut down off the gRPC server's
	// control path. Wait for them here so the deferred conn.Close()
	// doesn't yank the connection pool while they're still using it.
	bg.Wait()
}
