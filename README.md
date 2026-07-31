# Kheir Studio — company site

One self-contained `index.html`. No build step, no dependencies, no framework.
Hosted free on GitHub Pages under a custom domain.

---

## Before you publish

Replace the placeholders in the small legal line at the bottom of **both**
`index.html` and `contact.html`:

| Placeholder | Replace with |
|---|---|
| `[COMPANY NUMBER]` | Companies House registration number |
| `[REGISTERED ADDRESS]` | Registered office, exactly as filed |
| `[YOUR FULL NAME]` | Director's full legal name |

These must match Companies House **exactly** — Apple cross-checks them against
your D-U-N-S record during organization verification, and a mismatch is a
common reason enrollment stalls.

Also update `CNAME` if you register a domain other than `kheirstudio.com`, and
change the two email addresses in `contact.html` to whatever you actually use.

### Making the contact form send

`contact.html` posts to Formspree. Until you set it up, the form falls back to
opening the visitor's mail client, so it is never broken, just less smooth.

1. Sign up free at [formspree.io](https://formspree.io) and create a form
2. Copy the endpoint id (the part after `/f/`)
3. In `contact.html`, replace `FORM_ENDPOINT` with it

Free tier is 50 submissions a month. [Web3Forms](https://web3forms.com) is a
drop-in alternative with no monthly cap if you outgrow it.

The form includes a hidden honeypot field (`_gotcha`) that Formspree uses to
drop bot submissions automatically.

---

## Deploying to GitHub Pages

1. **Create the repo**

   ```bash
   cd kheir-studio-site
   git init && git add -A && git commit -m "Kheir Studio company site"
   gh repo create kheir-studio-site --public --source=. --push
   ```

2. **Turn on Pages** — repo → Settings → Pages → Source: *Deploy from a branch*,
   branch `main`, folder `/ (root)`. It goes live at
   `https://<user>.github.io/kheir-studio-site/` within a minute or two.

3. **Point your domain at it.** At your registrar, add:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<user>.github.io` |

4. Back in Settings → Pages, enter the custom domain and tick
   **Enforce HTTPS** once the certificate is issued (usually under an hour).

The `CNAME` file in this repo tells Pages which domain to serve, so keep it.

---

## Notes

- Everything is inline: one HTTP request for the page, plus Google Fonts.
  Drop the fonts `<link>` if you would rather have zero third-party requests;
  it falls back to the system UI font cleanly.
- The animated background pauses when the tab is hidden and is disabled
  entirely under `prefers-reduced-motion`.
- Scroll reveals have a 3-second failsafe, so content can never be left
  invisible if something stalls.
