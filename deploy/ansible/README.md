# Deploying Prosper with Ansible

Prosper is a self-hosted expense tracker, so "deploying" it means standing up
the whole stack on a machine you own — a Raspberry Pi at home or a small VM. The
required roles give you everything Prosper needs to serve over HTTPS:

- Docker
- MariaDB
- Nginx
- a Let's Encrypt certificate
- the app itself, which then auto-updates via `bash_ci.sh`

Add these to any box and Prosper runs, co-hosted with whatever else lives there.

The rest is optional — there for when you're provisioning a bare machine rather
than co-hosting on one that's already set up. SSH lockdown and fail2ban harden a
box that's freshly exposed to the internet, and `ddclient` keeps your DNS
pointed at a home server whose WAN IP changes. On a VM with a static IP that's
already hardened, leave them off.

Everything you need lives under `deploy/ansible/`: the shared `playbook.yml`,
the roles that do the work, and one `example/` env you copy as a starting point.
Your real hosts and secrets go in `deploy/ansible/private/<env>/` (gitignored).
The workflow is: copy the example, edit one vault file, run one command.

> Just want to try Prosper without provisioning a server? See the root
> [README](../../README.md) for running it locally with Docker.

## 1. Prerequisites (laptop, one-time)

    brew install ansible   # or your package manager
    ansible-galaxy collection install community.general ansible.mysql

You also need an SSH key (`ssh-keygen -t ed25519` if you don't have one). For a
Raspberry Pi, install the
[Raspberry Pi Imager](https://www.raspberrypi.com/software/).

## 2. Point DNS at the host

Set your domain once so the snippets below work as-is:

    DOMAIN=prspr.example.com

Cert issuance fails without DNS. Create an `A` record for `$DOMAIN` pointing at
the target IP — the VM's static IP, or your current WAN IP for a Pi (`ddclient`
keeps it current after the first deploy). Verify:

    dig +short "$DOMAIN"

## 3. Flash and boot (Pi only)

Use Raspberry Pi Imager to write **Raspberry Pi OS Lite 64-bit** to the card. In
its OS-customization settings, set the hostname, a user (becomes
`ansible_user`), and enable SSH with your public key. Boot the Pi, find its IP
(use `ping prosper.local`), then confirm passwordless SSH:

    ssh your_user@<host-ip>

## 4. Prepare the env subdir

    # name this env whatever you like: prod, staging, pi, …
    ENVIRONMENT=prod

    # Run this from the repo root
    cd deploy/ansible
    cp -r example private/$ENVIRONMENT

- `inventory.yml`: set `ansible_host`, `ansible_user` (and `ansible_port` if you
  set a custom `ssh_port`).
- `group_vars/all/vault.yml`: the only config file per env — every setting is
  documented inline.

Then encrypt the vault:

    echo 'a-strong-passphrase' > private/$ENVIRONMENT/vault-password.txt
    chmod 600 private/$ENVIRONMENT/vault-password.txt
    ansible-vault encrypt private/$ENVIRONMENT/group_vars/all/vault.yml \
        --vault-password-file private/$ENVIRONMENT/vault-password.txt

## 5. Run

From `deploy/ansible/` — the playbook is shared across envs, the inventory and
vault select which env to deploy:

    ansible-playbook playbook.yml \
        -i private/$ENVIRONMENT/inventory.yml \
        --vault-password-file private/$ENVIRONMENT/vault-password.txt

## 6. Verify

    curl -I "https://$DOMAIN"   # → HTTP/2 200

On the host: `systemctl status prosper` and `journalctl -u prosper -f`.

## Re-deploys and config changes

Edit the vault, then re-run the step 5 command:

    ansible-vault edit private/$ENVIRONMENT/group_vars/all/vault.yml \
        --vault-password-file private/$ENVIRONMENT/vault-password.txt

App **code** updates ride the `bash_ci.sh` loop on the server — no playbook
re-run needed.

## Multiple environments

Each `private/<env>/` holds one host's inventory and secrets; all envs share the
same `playbook.yml`. Add one by copying the example again into a new subdir and
repeating steps 4–5.
