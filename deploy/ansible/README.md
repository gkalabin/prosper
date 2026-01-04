# Ansible Setup for Self-Hosting

This directory contains Ansible configuration for setting up the Raspberry Pi to
host the application.

## Prerequisites

- Ansible installed on your local machine.
- SSH access to your Raspberry Pi.

## Usage

1. Update `hosts.ini` with your Raspberry Pi's IP address and user.
2. Run the playbook:

```bash
ansible-playbook site.yml
```
