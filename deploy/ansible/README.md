# Ansible Setup for Self-Hosting Prosper

This directory contains Ansible configuration for setting up a server to host
the Prosper application. It is designed to be modular and configurable.

## Prerequisites

- Ansible installed on your local machine.
- SSH access to your target server (Debian-based recommended).
- A domain name pointing to your server IP.

## Directory Structure

- `site.yml`: The main playbook.
- `hosts.ini`: Inventory file.
- `group_vars/all.yml`: Global variables and configuration.
- `roles/`: Modular roles for different components (common, security, nginx, etc.).

## Configuration

Before running the playbook, you **must** configure the variables in `group_vars/all.yml`.
Important variables to check and update:

- `prosper_user`, `prosper_user_email`: System user and Git configuration.
- `app_domain`: Your domain name (e.g., `prspr.xyz`).
- `security_ssh_port`: Port for SSH (default `2223`).
- `security_authorized_keys`: Add your public SSH key here to access the server.
- `db_password`: Database password.
- `nextauth_secret`, `truelayer_client_id`, etc.: Application secrets.
- `certbot_admin_email`: Email for SSL certificate registration.

## Roles

The setup is divided into the following roles:

- **common**: Updates system, installs basic tools (git, curl, vim, etc.), creates user, configures logs and log rotation.
- **security**: Configures `fail2ban` (optional), hardens SSH (disables root login, password auth, changes port), sets up SSH keys.
- **docker**: Installs Docker and Docker Compose from official repositories.
- **nginx**: Installs Nginx, configures reverse proxy, and handles SSL via Certbot.
- **ddns**: Configures `ddclient` for dynamic DNS (optional).
- **database**: Installs MariaDB, sets up database/user, and configures backup scripts.
- **prosper**: Clones the application repo, configures `.env`, sets up systemd service, and cron jobs.

## Usage

1.  **Update Inventory:**
    Edit `hosts.ini` with your server's IP address and initial connection user (e.g., `root` or `ubuntu`).

    ```ini
    [webservers]
    192.168.1.10 ansible_user=root
    ```

2.  **Configure Variables:**
    Edit `group_vars/all.yml` with your settings and secrets.

    > **Security Note:** For production, consider using `ansible-vault` to encrypt sensitive variables in `group_vars/all.yml`.

3.  **Run the Playbook:**

    ```bash
    ansible-playbook -i hosts.ini site.yml
    ```

    If you are running this for the first time and changing the SSH port, subsequent runs will need the new port.

    ```bash
    ansible-playbook -i hosts.ini site.yml -e "ansible_port=2223"
    ```

## Optional Components

You can enable/disable optional components in `group_vars/all.yml`:

- `security_enable_fail2ban`: Set to `false` to skip fail2ban.
- `ddns_enabled`: Set to `true` to enable dynamic DNS client.
- `backups_enabled`: Set to `false` to skip backup repo setup.
