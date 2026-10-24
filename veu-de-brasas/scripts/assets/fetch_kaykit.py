"""Baixa os pacotes gratuitos KayKit (Kay Lousberg, licença CC0) do itch.io para assets-src/kaykit/
e os descompacta. Necessário só para regenerar os sprites/cenário (a saída já está no Git).

Pacotes: Adventurers, Skeletons, Dungeon, Forest Nature e Character Animations.
Uso: python3 scripts/assets/fetch_kaykit.py
"""
import http.cookiejar, json, os, re, time, urllib.parse, urllib.request, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEST = os.path.join(ROOT, 'assets-src', 'kaykit')
PACKS = {
    'KayKit_Adventurers.zip': 'https://kaylousberg.itch.io/kaykit-adventurers',
    'KayKit_Skeletons.zip': 'https://kaylousberg.itch.io/kaykit-skeletons',
    'KayKit_Dungeon.zip': 'https://kaylousberg.itch.io/kaykit-dungeon-pack',
    'KayKit_Forest.zip': 'https://kaylousberg.itch.io/kaykit-forest',
    'KayKit_Character_Animations.zip': 'https://kaylousberg.itch.io/kaykit-character-animations',
}


def fetch(opener, url, data=None):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None,
                                 headers={'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest'})
    with opener.open(req, timeout=120) as r:
        return r.read()


def download(name, page):
    """fluxo de download do itch.io para pacotes "pague quanto quiser" (sem pagamento)"""
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    html = fetch(opener, page).decode('utf8', 'ignore')
    tok = re.search(r'name="csrf_token" value="([^"]+)"', html)
    dl_page = json.loads(fetch(opener, page + '/download_url', {'csrf_token': tok.group(1) if tok else ''}))['url']
    d = fetch(opener, dl_page).decode('utf8', 'ignore')
    tok2 = re.search(r'name="csrf_token" value="([^"]+)"', d)
    uid = re.search(r'data-upload_id="(\d+)"', d).group(1)
    url = json.loads(fetch(opener, f'{page}/file/{uid}?source=game_download', {'csrf_token': tok2.group(1) if tok2 else ''}))['url']
    with open(os.path.join(DEST, name), 'wb') as f:
        f.write(fetch(opener, url))


def main():
    os.makedirs(DEST, exist_ok=True)
    for name, page in PACKS.items():
        path = os.path.join(DEST, name)
        if not os.path.exists(path):
            for tentativa in range(5):
                try:
                    print('baixando', name)
                    download(name, page)
                    break
                except Exception as e:  # o itch.io limita requisições seguidas (HTTP 429)
                    print('  falhou:', e, '— tentando de novo em 90 s')
                    time.sleep(90)
            time.sleep(20)
        zipfile.ZipFile(path).extractall(DEST)
    print('pronto:', DEST)


if __name__ == '__main__':
    main()
