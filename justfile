install:
    #!/usr/bin/env bash
    set -euo pipefail
    read -rp "Vault location: " vault
    vault="${vault%/}"
    dest="$vault/.obsidian/plugins/imprint"

    if [ ! -d "$vault" ]; then
        echo "Error: vault not found at $vault"
        exit 1
    fi

    npm run build

    mkdir -p "$dest"
    cp main.js manifest.json "$dest/"
    echo "Installed to $dest"

