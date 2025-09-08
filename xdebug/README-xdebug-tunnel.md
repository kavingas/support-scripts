# Xdebug Tunnel Manager

A bash script that automates SSH operations for managing Xdebug sockets across multiple Magento Cloud nodes.

## Features

- Automatically discovers all SSH hosts for a given project and environment
- Finds and cleans up existing Xdebug socket files
- Creates SSH tunnels for remote debugging
- Handles staging environment naming conventions
- Graceful cleanup on script termination

## Prerequisites

- `magento-cloud` CLI installed and authenticated
- SSH access to Magento Cloud environment
- Bash shell environment

## Usage

```bash
./xdebug-tunnel-manager.sh -p PROJECT_ID -e ENVIRONMENT [OPTIONS]
```

### Required Arguments

- `-p PROJECT_ID`: Magento Cloud project ID (e.g., zne3kxtgzjvzi)
- `-e ENVIRONMENT`: Environment name (e.g., staging)

### Optional Arguments

- `-l LOCAL_PORT`: Local port for Xdebug tunnel (default: 9003)
- `-h`: Show help message

### Example

```bash
./xdebug-tunnel-manager.sh -p zne3kxtgzjvzi -e staging
```

## How it Works

1. **Discovery**: Runs `magento-cloud ssh -p PROJECT_ID -e ENVIRONMENT --all` to find all SSH hosts
2. **Socket Detection**: Connects to a node and finds the Xdebug socket path using `cat /etc/platform/*/nginx.conf | grep xdebug.sock`
3. **Cleanup**: Removes existing socket files on all nodes using `rm /run/platform/SOCKET_DIR/xdebug.sock`
4. **Environment Handling**: For staging environments, appends `_stg` to the project ID for socket directory naming
5. **Tunnel Creation**: Opens SSH reverse tunnels for each node: `ssh -R /run/platform/SOCKET_DIR/xdebug.sock:localhost:PORT -N HOST`

## Environment-Specific Behavior

- **Staging**: Socket directory becomes `{PROJECT_ID}_stg`
- **Other environments**: Socket directory remains `{PROJECT_ID}`

## Output

The script provides colored, timestamped output showing:
- SSH hosts discovered
- Socket cleanup results
- Tunnel creation status
- Summary of active tunnels with ports and PIDs

## Termination

Press `Ctrl+C` to stop all tunnels. The script will automatically clean up all SSH tunnel processes.
