# Ansible Setup for Self-Hosting

This directory contains Ansible configuration for setting up a server to host
the application.

## Prerequisites

- Ansible installed on your local machine.
- SSH access to your server.

## Usage

1. Update `hosts.ini` with your server's IP address and user.
2. Run the playbook:

```bash
ansible-playbook site.yml
```
