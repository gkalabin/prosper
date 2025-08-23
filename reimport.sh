# reimport

sudo mysql prosperdb -e 'drop database prosperdb'
(cd ~/rpi-backups/; git pull; ./restore_from_latest_backup.sh)
sudo mysql prosperdb -e 'delete from NordigenToken where bankId=18'
(cd ~/prosper; npx prisma db push)
curl http://127.0.0.1:3000/api/migrate-double-entry