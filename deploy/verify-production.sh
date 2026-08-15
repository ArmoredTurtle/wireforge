#!/usr/bin/env bash
set -euo pipefail

echo | openssl s_client \
  -connect 127.0.0.1:443 \
  -servername wireforge.armoredturtle.com 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName

sudo certbot renew --dry-run --cert-name wireforge.armoredturtle.com
sudo apache2ctl configtest
systemctl is-active apache2

release_dir="/var/www/wireforge.armoredturtle.com/releases/20260815-154317"
echo "release_files=$(find "$release_dir" -type f | wc -l)"
if find "$release_dir" -type f \( -name '*.toml' -o -name '*.json' -o -name '*.db' \) | grep -q .; then
  echo "Unexpected data file in static release" >&2
  exit 1
fi
echo "release_data_files=0"

for url in \
  https://armoredturtle.com/ \
  https://armoredturtle.xyz/ \
  https://scalemyset.com/; do
  curl -sS -o /dev/null -w "${url} %{http_code}\n" "$url"
done
