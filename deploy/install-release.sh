#!/usr/bin/env bash
set -euo pipefail

release="${1:?release id required}"
if [[ ! "$release" =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
  echo "Invalid release id" >&2
  exit 2
fi

archive="wireforge-${release}.tar.gz"
site_root="/var/www/wireforge.armoredturtle.com"
release_dir="${site_root}/releases/${release}"
backup_dir="/var/backups/wireforge/${release}"
vhost="/etc/apache2/sites-available/wireforge.armoredturtle.com.conf"

cd /tmp
tr -d '\r' < "${archive}.sha256" | sha256sum -c -

sudo install -d -m 0755 "$backup_dir" "$release_dir"
if sudo test -f "$vhost"; then
  sudo cp -a "$vhost" "$backup_dir/"
fi
if sudo test -L "${site_root}/current"; then
  sudo readlink "${site_root}/current" | sudo tee "${backup_dir}/previous-current.txt" >/dev/null
fi

sudo tar -xzf "/tmp/${archive}" -C "$release_dir"
sudo chown -R root:www-data "$release_dir"
sudo find "$release_dir" -type d -exec chmod 0755 {} +
sudo find "$release_dir" -type f -exec chmod 0644 {} +

sudo ln -sfn "$release_dir" "${site_root}/current.new"
sudo mv -Tf "${site_root}/current.new" "${site_root}/current"
if ! sudo test -f "$vhost"; then
  sudo install -o root -g root -m 0644 /tmp/wireforge-http.conf "$vhost"
fi
sudo a2ensite wireforge.armoredturtle.com.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

systemctl is-active apache2
curl -sS -o /dev/null -w 'http_host_probe=%{http_code}\n' \
  -H 'Host: wireforge.armoredturtle.com' http://127.0.0.1/
readlink "${site_root}/current"
