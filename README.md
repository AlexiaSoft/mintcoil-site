# MintCoil Site

Static product website for **MintCoil by AlexiaSoft**, Mint product family.
HTML/CSS/vanilla JS only: no Laravel, database, runtime npm dependency or build.
Deploy independently of `mintcoil/`.

## Current: supplied MintCoil wordmark (Phase39)

Header/Footer now use user-supplied `assets/images/mintcoil_logo.png` (879×259),
unchanged original white background/clear space.200px wide/auto height;180px on
small phones. Semantic alt text and no duplicate MintCoil text. SVG Coil icon stays
favicon. Application public PNG is byte-identical but runtime/deploy independent.

Latest complete app173/3,602 and Browser pass; site five-width/axe/price/nav/FAQ/
no-JS/delayed-JS CLS/fallback pass. Initial320px menu wrap fixed via180px logo,
not relaxing CLS. Lighthouse100/100/100/100,LCP1.5s,CLS0. Core including PNG89,933
bytes (<96KiB budget updated explicitly for user-approved25KiB logo); screen/social
budgets unchanged. Logs `/tmp/mintcoil-logo-{feature,browser,site}.log`. Real devices/
Safari/deploy pending. Original artwork not cropped/recoloured or used as square favicon.

## Approved MintCoil pricing (Phase38)

User accepted the recommended pricing; native `#pricing` section in header/footer
and FAQ now lists two purchase models, with Core/Business sharing all core features:

| Model | Core | Business |
| --- | --- | --- |
| Subscription/month | ฿2,900 | ฿4,900 |
| Subscription/year (10 months) | ฿29,000 | ฿49,000 |
| Subscription setup, starting | ฿15,000 | ฿29,000 |
| License once | ฿149,000 | ฿249,000 |
| License setup, starting | ฿30,000 | ฿50,000 |
| Accounts / warehouses | 5 / 2 | 15 / 6 |

Extras: Subscription ฿200/account/month, ฿500/warehouse/month; License
฿8,000/account, ฿15,000/warehouse. No annual-extra price/discount invented.
License maintenance/updates from year2:18% of License/year; perpetual rights per
contract, no Hosting/server/backup/infrastructure or unlimited custom development.
All prices starting/exclude VAT; setup separate, migration/ERP/scales/custom work
quoted separately. Subscription Hosting/Backup/standard updates/business-hours
Support is the proposed service bundle; costs/scope must be confirmed in quotation,
no promised SLA/backup frequency. Training/setup/test rounds agreed in quotation.

Static commercial presentation only: no checkout, billing, license keys or backend
account/warehouse enforcement. All CTAs use existing contact section. No stock/app
change. Native monthly+annual text is visible together without another JS toggle.
Latest five-width/axe/no-JS/pricing-values/setup/capacity/terms/button geometry checks
pass; Lighthouse100/100/100/100,LCP1.2s,CLS0. Core64,631 bytes (<64KiB). Screens
unchanged. Evidence `/tmp/mintcoil-pricing-site.log`, temporary pricing screenshots
in `os.tmpdir()/mintcoil-site-qa-results`. Public deployment/human/Safari pending.

## Mint family alignment (Phase37)

Reference: user-provided public `https://minterp.alexiasoft.co/`, inspected HTML,
CSS and rendered page on2026-10-12. Pale steel-white/grid canvas, Mint–Blue ambient
light and gradient headings/CTA, pill buttons, restrained white cards, centred
section introductions, workflow/manager view/screens/starting steps/FAQ and dark
company footer follow the MintERP presentation. Keep original Coil logo and
shared `--mc-*` product/status tokens. Separate `--site-*` presentation tokens
make marketing consistent with the family without changing internal stock UI.

Reference MintERP uses remote Inter/Outfit/Noto Sans Thai and some tiny type;
MintCoil retains local Thai-capable system fonts, readable body/supporting text,
48px buttons, native keyboard navigation/reduced-motion/transparency fallbacks.
Primary button gradient is darker than the reference so white text passes AA.
No remote fonts, runtime library, tracking, form or site-set cookies added.

Content describes actual Coil/location/Search/Receive/Move/Transfer/Issue,
multi-warehouse1–100-line receipt/issue documents, Dashboard/History/Reports,
use cases and rollout questions. Keep AVAILABLE-only Issue/new-only Receive;
full-Coil transactions, no partial issue. Attachment, legacy-document entry
integration, ERP/export/QR/Supplier and human operational acceptance remain pending.
No MintERP modules/pricing/service guarantees copied. MintCoil-specific starting
prices subsequently approved in Phase38; final scope/services remain quotation-bound.

Contact uses public company channels displayed on the reference page:
`sale@alexiasoft.co`, `061-697-5959` (`tel:+66616975959`). Links open the visitor's
email/phone application; the page itself collects/sends no personal information.
Company/MintERP footer destinations link to the public family sites, not a claim
that the products integrate. No application login URL or public demo account guessed.
Actual scheduling/delivery of email/calls has not been tested.

## Product visuals

- Hero4×4 Map and metric panel are explicitly fictional illustrations, not live
  stock or actual screenshots. Six occupied of11 Coil positions matches the map.
- Four real application-v2 screenshots: Dashboard, Warehouse Layout, Receive
  Document and Reports; captured by the Phase36 disposable Browser QA. Empty
  states/zero counts are genuine test setup, not customer data or claimed results.
- `screen-{dashboard,layout,receive,reports}.webp`:1120×790, account header/sidebar
  cropped out, local/lazy-loaded with explicit dimensions/alt text/full-size links.
  Combined121,834 bytes. Replace only with reviewed non-sensitive QA screenshots;
  don't publish production accounts/customer stock or unlabeled invented screen data.
- Social artwork: `social-card.svg`, exported `social-card.png`1200×630/50,410 bytes.
  Updated Mint–Blue theme; not loaded as a page image. Absolute social URL still pending.

## Preview / deploy

```sh
cd mintcoil-site
python3 -m http.server 8081 --bind 127.0.0.1
```

Open `http://127.0.0.1:8081`. Publish only `index.html` and `assets/` to the static
host, preserving relative paths (also works under a path prefix). Never publish
sibling Laravel code/credentials. HTTP preview is recommended for SVG sprites;
Python is local QA tooling, not production hosting.

## Before public launch

1. Confirm site domain and approved application URL/release; no fake Login link.
2. Add absolute HTTPS canonical/og:url/og:image; verify social crawlers on target host.
3. Approved MintCoil starting prices are listed; confirm service costs/scope,
   commercial/legal contract details and contact routing before actual sales.
   Native privacy disclosure is not an approved legal policy; host logs may exist.
   Do not copy MintERP commercial/legal scope as MintCoil promises.
4. Verify real mail/phone channels, HTTPS/DNS/security headers/cache and devices.
5. Complete separate application UAT/release before offering production access.

## QA (external tools only)

From repository root:

```sh
python3 tests/check_foundation.py
npm install --prefix /tmp/mintcoil-site-qa --no-save playwright lighthouse @axe-core/playwright
NODE_PATH=/tmp/mintcoil-site-qa/node_modules \
BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
RUN_LIGHTHOUSE=1 node mintcoil-site/tests/browser.cjs
```

Set Chrome path for your platform; omit `RUN_LIGHTHOUSE=1` for browser-only QA.
Harness copies only index/assets under a temporary `/preview/` static server and
cleans up. No app/server/database starts, accounts/settings/stock touched.

Latest: Chrome1440/1024/768/375/320, axe WCAG2A/AA+2.1AA, no overflow, menu
Escape/resize/focus, native FAQ Enter toggling, delayed-JS startup CLS, no-JS/skip
link, reduced transparency/motion, allowlisted real contact/family/image links,
local WebP decode/lazy loading, social MIME/dimensions, no external page requests,
console/network errors or cookies. Core assets52,948 bytes (<64KiB); four screenshots
121,834 bytes (<512KiB separate budget). Lighthouse100/100/100/100,LCP1.1s,CLS0.
Local simulation, not actual-device/Safari/host/user acceptance or delivery guarantee.
App/native suites not rerun: unchanged. Log `/tmp/mintcoil-family-site.log`.
Screenshots/Lighthouse JSON: `os.tmpdir()/mintcoil-site-qa-results` (temporary).

Brand reference: `../BRANDING.md`. CSS/image copies do not share runtime dependencies.
