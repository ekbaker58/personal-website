#!/usr/bin/env bash
# Copies the playable game files from your "Code games" folder into this website.
# Run it after you change a game:   npm run sync-games
#
# Only the files a browser needs for solo play are copied (no servers, no saved player data).
# Flappy Flock and Plinko 32 play solo. The other three only get their icons,
# because they need the game-night server running on your Mac.
# Two small changes are made to the copies (never to your originals): the game pages use the
# site's own fonts instead of Google Fonts, and Plinko's page gets the <head> its server normally adds.

set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAMES_SRC="${GAMES_SRC:-$HOME/Desktop/Code games}"
GAMES_DEST="$SITE_DIR/games"

if [ ! -d "$GAMES_SRC" ]; then
  echo "Can't find your games folder at: $GAMES_SRC"
  echo "If it moved, run:  GAMES_SRC=\"/path/to/Code games\" npm run sync-games"
  exit 1
fi

copy() {
  local from="$GAMES_SRC/$1" to="$GAMES_DEST/$2"
  if [ ! -f "$from" ]; then
    echo "  missing: $1 (skipped)"
    return
  fi
  mkdir -p "$(dirname "$to")"
  cp "$from" "$to"
  echo "  copied:  $1"
}

# The original games load their fonts from Google. The website copies use the site's own
# font files (fonts/games.css) instead, so visitors who open a game don't contact Google.
use_site_fonts() {
  local page="$GAMES_DEST/$1"
  [ -f "$page" ] || return 0
  sed -E \
    -e '/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"/d' \
    -e 's#<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">#<link rel="stylesheet" href="../../fonts/games.css">#' \
    "$page" > "$page.tmp"
  mv "$page.tmp" "$page"
  if grep -q 'fonts\.googleapis\.com\|fonts\.gstatic\.com' "$page"; then
    echo "  warning: games/$1 still loads Google Fonts. Its font links changed; update use_site_fonts in scripts/sync-games.sh."
  else
    echo "  fonts:   games/$1 uses the site's own fonts"
  fi
}

# Plinko's game.html is a page fragment: at game night its server adds the <head> (charset,
# phone viewport, icon). The website serves the file as-is, so add those lines here.
# Never add the server's window.PLINKO_ONLINE line: it would lock visitors out of solo play.
add_plinko_head() {
  local page="$GAMES_DEST/plinko-32/game.html"
  [ -f "$page" ] || return 0
  grep -qi '^<!doctype' "$page" && return 0
  {
    printf '%s\n' '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    printf '%s\n' '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    printf '%s\n' '<meta name="theme-color" content="#0a0d26">'
    printf '%s\n' '<link rel="icon" href="icon.svg">'
    cat "$page"
  } > "$page.tmp"
  mv "$page.tmp" "$page"
  echo "  head:    games/plinko-32/game.html gets a page head for phones"
}

echo "Syncing games from $GAMES_SRC"

# Playable in the browser (solo mode)
copy "flappy-flock/public/game.html"            "flappy-flock/game.html"
copy "flappy-flock/public/sim.js"               "flappy-flock/sim.js"
copy "flappy-flock/public/skins.js"             "flappy-flock/skins.js"
copy "flappy-flock/public/icon.svg"             "flappy-flock/icon.svg"
copy "flappy-flock/public/manifest.webmanifest" "flappy-flock/manifest.webmanifest"
copy "plinko-32/public/game.html"               "plinko-32/game.html"
copy "plinko-32/public/icon.svg"                "plinko-32/icon.svg"
use_site_fonts "flappy-flock/game.html"
use_site_fonts "plinko-32/game.html"
add_plinko_head

# Game-night-only games: icons for their cards
copy "game-night-hub/public/icon.svg"           "game-night-hub/icon.svg"
copy "brain-brawl/public/icon.svg"              "brain-brawl/icon.svg"
copy "doodle-telephone/public/icon.svg"         "doodle-telephone/icon.svg"

echo "Done. Refresh the site to see the changes."
