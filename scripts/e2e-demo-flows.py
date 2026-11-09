"""Browser walk-through of every flow, in DEMO MODE only.

Usage:
  pip install playwright && playwright install chromium
  npm run dev            # in another terminal (demo mode is on by default in dev)
  python3 scripts/e2e-demo-flows.py          # or BASE_URL=http://localhost:3001 python3 ...

It takes screenshots into /tmp/shots, so create that folder first.
"""
import re, sys, json
from playwright.sync_api import sync_playwright, expect

import os
BASE=os.environ.get("BASE_URL","http://localhost:3000")
results=[]
def check(name, ok, detail=""):
    results.append((name, ok, detail)); print(("PASS " if ok else "FAIL ")+name+(f"  [{detail}]" if detail and not ok else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    errors=[]
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type=="error" else None)

    # ---- public pages render
    for path,heading in [("/", "Vote the next big one"),("/nominees","Nominees"),("/leaderboard","Leaderboard"),("/contact","Contact us"),("/terms","Terms"),("/privacy","Privacy"),("/refunds","Refunds"),("/login","Log in"),("/register","Create your account"),("/forgot-password","Reset your password")]:
        pg.goto(BASE+path); pg.wait_for_load_state("networkidle")
        txt=" ".join(pg.inner_text("body").split())
        check(f"page {path} renders", heading.lower().replace("’","'") in txt.lower().replace("’","'"), txt[:80])
    pg.goto(BASE+"/"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(600)
    pg.screenshot(path="/tmp/shots/home-desktop.png", full_page=True)

    # ---- logged-out guard
    pg.goto(BASE+"/dashboard"); pg.wait_for_url(re.compile(r"/login\?next="), timeout=8000)
    check("signed-out dashboard redirects to login with next", "/login?next=%2Fdashboard" in pg.url, pg.url)

    # ---- register -> check email -> confirm -> login
    pg.goto(BASE+"/register")
    pg.get_by_role("button", name="Create account").click()
    check("register shows validation errors", pg.get_by_text("Tell us what to call you").count()>0 and pg.get_by_text("Enter your email address").count()>0)
    pg.get_by_label("Display name").fill("Tolu")
    pg.get_by_label("Email").fill("tolu@example.com")
    pg.get_by_label("Password").fill("short")
    pg.get_by_label(re.compile("I agree")).check()
    pg.get_by_role("button", name="Create account").click()
    check("register rejects short password", pg.get_by_text("Use at least 8 characters").count()>0)
    pg.get_by_label("Password").fill("longenough1")
    pg.get_by_role("button", name="Create account").click()
    pg.wait_for_url(re.compile(r"/check-email"), timeout=8000)
    check("register goes to check-email", "tolu%40example.com" in pg.url or "tolu@example.com" in pg.url, pg.url)
    # unconfirmed login blocked
    pg.goto(BASE+"/login")
    pg.get_by_label("Email").fill("tolu@example.com"); pg.get_by_label("Password").fill("longenough1")
    pg.get_by_role("button", name="Log in").click()
    pg.wait_for_selector("[role=alert]:not(#__next-route-announcer__)")
    check("unconfirmed account cannot log in", "Confirm your email first" in pg.inner_text("main"))
    pg.goto(BASE+"/check-email?email=tolu@example.com")
    pg.get_by_role("button", name="Resend email").click()
    pg.wait_for_selector("[role=status]")
    check("resend email shows confirmation", "sent the link again" in pg.inner_text("body"))
    pg.get_by_role("button", name=re.compile("Demo: I opened the link")).click()
    pg.wait_for_url(re.compile("/email-confirmed"))
    check("email confirmed page", "EMAIL" in pg.inner_text("body").upper())

    # ---- wrong password then right
    pg.goto(BASE+"/login")
    pg.get_by_label("Email").fill("tolu@example.com"); pg.get_by_label("Password").fill("wrongpassword")
    pg.get_by_role("button", name="Log in").click(); pg.wait_for_selector("text=Wrong email or password")
    check("wrong password shows helpful error", "Wrong email or password" in pg.inner_text("main"))
    pg.get_by_label("Password").fill("longenough1"); pg.get_by_role("button", name="Log in").click()
    pg.wait_for_url(re.compile("/dashboard"), timeout=8000)
    pg.wait_for_selector("h1:has-text('HELLO')", timeout=8000)
    check("login lands on dashboard with greeting", "HELLO, TOLU" in pg.inner_text("h1").upper(), pg.inner_text("h1"))
    check("new fan starts with zero balance", "\u20a60" in pg.inner_text("main"))

    # ---- wallet: validation, demo checkout failure, success
    pg.goto(BASE+"/wallet"); pg.wait_for_selector("text=Add credits")
    pg.get_by_label("Custom amount").fill("100")
    pg.get_by_role("button", name="Continue to secure checkout").click()
    check("wallet enforces minimum top-up", pg.get_by_text("The minimum is").count()>0, pg.inner_text("main")[:200])
    pg.get_by_role("button", name=re.compile(r"^\u20a61,000")).click()
    pg.get_by_role("button", name="Continue to secure checkout").click()
    pg.get_by_role("button", name="Simulate a failed payment").click(); pg.wait_for_selector("text=payment failed")
    check("failed payment adds no credits", "no credits were added" in pg.inner_text("main"))
    pg.get_by_role("button", name="Continue to secure checkout").click()
    pg.get_by_role("button", name="Simulate a successful payment").click(); pg.wait_for_selector("text=Payment verified")
    pg.wait_for_timeout(400)
    check("verified payment credits wallet", "\u20a61,000" in pg.inner_text("main"))
    pg.screenshot(path="/tmp/shots/wallet-desktop.png", full_page=True)

    # ---- vote: not enough credits, then vote, receipt, ledger
    pg.goto(BASE+"/nominees"); pg.wait_for_selector("text=Sample Artist 1")
    check("browse lists 8 published nominees", pg.locator("ul li", has_text="View and vote").count()==8, str(pg.locator("ul li", has_text="View and vote").count()))
    pg.get_by_role("searchbox").fill("zzzz"); check("empty search shows empty state", pg.get_by_text("No nominees match.").count()>0)
    pg.get_by_role("button", name="Clear search and filters").click()
    pg.get_by_role("button", name="Best Gospel Act").click()
    check("category filter narrows results", pg.locator("ul li", has_text="View and vote").count()==1)
    pg.goto(BASE+"/nominees/sample-artist-1"); pg.wait_for_selector("text=Cast your votes")
    pg.get_by_role("group", name="Number of votes").get_by_role("button", name=re.compile("^10")).click()
    check("10 votes (\u20a6500) is affordable with \u20a61,000", pg.get_by_text("Not enough credits").count()==0)
    pg.get_by_role("group", name="Number of votes").get_by_role("button", name=re.compile("^3")).click()
    pg.get_by_role("button", name=re.compile(r"^Vote for")).click()
    pg.get_by_role("button", name="Confirm and vote").click()
    pg.wait_for_url(re.compile("/receipts/"), timeout=8000)
    pg.wait_for_selector("h2:has-text('Vote receipt')")
    body=pg.inner_text("main")
    check("receipt shows 3 votes, \u20a6150 total, \u20a6850 left", "\u20a6150" in body and "\u20a6850" in body and "SAMPLE-V-" in body, body[:300])
    pg.screenshot(path="/tmp/shots/receipt-desktop.png", full_page=True)
    pg.goto(BASE+"/dashboard"); pg.wait_for_selector("text=Voting activity"); pg.wait_for_timeout(300)
    check("dashboard shows the vote and \u20a6850", "\u20a6850" in pg.inner_text("main") and "Sample Artist 1" in pg.inner_text("main"))
    pg.screenshot(path="/tmp/shots/dashboard-desktop.png", full_page=True)
    # insufficient credits: spend down then ask for 10
    pg.goto(BASE+"/nominees/sample-artist-2"); pg.wait_for_selector("text=Cast your votes")
    for _ in range(1):
        pg.get_by_role("group", name="Number of votes").get_by_role("button", name=re.compile("^10")).click()
        pg.get_by_role("button", name=re.compile(r"^Vote for")).click(); pg.get_by_role("button", name="Confirm and vote").click()
        pg.wait_for_url(re.compile("/receipts/"))
    pg.goto(BASE+"/nominees/sample-artist-2"); pg.wait_for_selector("text=Cast your votes")
    pg.get_by_role("group", name="Number of votes").get_by_role("button", name=re.compile("^10")).click()
    check("insufficient credits panel appears (\u20a6350 < \u20a6500)", pg.get_by_text("Not enough credits.").count()>0)
    check("vote button hidden when not affordable", pg.get_by_role("button", name=re.compile(r"^Vote for \u20a6500")).count()==0)
    pg.get_by_role("button", name="Choose fewer votes").click()
    check("choose fewer votes selects an affordable amount", pg.get_by_text("Not enough credits.").count()==0)
    pg.screenshot(path="/tmp/shots/nominee-desktop.png", full_page=True)

    # ---- settings
    pg.goto(BASE+"/settings"); pg.wait_for_selector("text=Change password")
    pg.get_by_label("Display name").fill("Tolu A."); pg.get_by_role("button", name="Save profile").click()
    pg.wait_for_selector("text=Profile saved")
    pg.get_by_label("Current password", exact=True).fill("longenough1"); pg.get_by_label("New password", exact=True).fill("another-pass1"); pg.get_by_label("Confirm new password").fill("different")
    pg.get_by_role("button", name="Update password").click()
    check("password mismatch is caught", pg.get_by_text("The two passwords do not match").count()>0)
    pg.screenshot(path="/tmp/shots/settings-desktop.png", full_page=True)

    # ---- non-admin cannot open admin
    pg.goto(BASE+"/admin"); pg.wait_for_url(re.compile("/dashboard"), timeout=8000)
    check("fan is kept out of /admin", "/dashboard" in pg.url)

    # ---- logout, disabled account, admin
    pg.get_by_role("button", name="Log out").click(); pg.wait_for_url(BASE+"/")
    pg.goto(BASE+"/login"); pg.get_by_label("Email").fill("disabled@example.com"); pg.get_by_label("Password").fill("password123"); pg.get_by_role("button", name="Log in").click()
    pg.wait_for_url(re.compile("/account-unavailable"), timeout=8000); check("disabled account is sent to account-unavailable", True)
    pg.goto(BASE+"/login"); pg.get_by_label("Email").fill("admin@example.com"); pg.get_by_label("Password").fill("admin12345"); pg.get_by_role("button", name="Log in").click()
    pg.wait_for_url(re.compile(r"/admin$"), timeout=8000); pg.wait_for_selector("text=Needs your attention")
    check("admin login lands on admin overview", True)
    pg.screenshot(path="/tmp/shots/admin-overview.png", full_page=True)

    # artists: add, publish -> shows publicly
    pg.goto(BASE+"/admin/artists"); pg.wait_for_selector("text=Add an artist")
    pg.get_by_role("button", name="Save and publish").click()
    check("artist form validates", pg.get_by_text("Enter the artist's name").count()>0 and pg.get_by_text("Choose at least one category").count()>0)
    pg.get_by_label("Artist name").fill("Zara Sound"); pg.get_by_label("Biography").fill("Lagos singer-songwriter.")
    pg.get_by_role("button", name=re.compile("Best New Artist")).click()
    pg.get_by_role("button", name="Save and publish").click(); pg.wait_for_selector("text=Zara Sound is published")
    pg.goto(BASE+"/nominees"); pg.wait_for_selector("text=Zara Sound"); check("admin-added artist appears on public nominees", True)
    pg.screenshot(path="/tmp/shots/admin-artists.png", full_page=True)

    # winners locked, close voting, publish
    pg.goto(BASE+"/admin/winners"); pg.wait_for_selector("text=Winners by category")
    check("winners locked while voting open", pg.get_by_text("Locked until voting closes").count()>0)
    pg.goto(BASE+"/admin/season"); pg.wait_for_selector("text=VOTING IS OPEN", state="attached")
    pg.get_by_role("button", name="Close voting").click(); pg.get_by_role("button", name="Yes, close voting").click(); pg.wait_for_selector("text=Voting is closed", state="attached")
    pg.screenshot(path="/tmp/shots/admin-season.png", full_page=True)
    pg.goto(BASE+"/admin/winners"); pg.wait_for_selector("text=Publish winner")
    pg.get_by_role("button", name="Publish winner").first.click(); pg.wait_for_selector("text=Published:")
    pg.goto(BASE+"/leaderboard"); pg.wait_for_selector("#winners li", timeout=8000)
    check("published winner appears on public leaderboard", pg.locator("#winners li").count()>=1)

    # refund flow
    pg.goto(BASE+"/admin/payments"); pg.wait_for_selector("text=SAMPLE-0005")
    pg.get_by_role("button", name="Issue refund for SAMPLE-0005").click()
    pg.get_by_role("button", name="Confirm refund").click()
    check("refund requires a reason", pg.get_by_text("Explain why in at least 10 characters").count()>0)
    pg.get_by_label("Reason (required)").fill("Duplicate payment confirmed with the fan.")
    pg.get_by_role("button", name="Confirm refund").click(); pg.wait_for_selector("text=Refund approved for SAMPLE-0005")
    pg.screenshot(path="/tmp/shots/admin-payments.png", full_page=True)
    pg.goto(BASE+"/admin/audit"); pg.wait_for_selector("text=Refund approved for SAMPLE-0005")
    check("refund and reason are in the audit log", "Duplicate payment" in pg.inner_text("main"))

    # voting closed state for fan
    pg.get_by_role("button", name="Log out").click() if pg.get_by_role("button", name="Log out").count() else None
    pg.goto(BASE+"/login"); pg.get_by_label("Email").fill("ada@example.com"); pg.get_by_label("Password").fill("password123"); pg.get_by_role("button", name="Log in").click(); pg.wait_for_url(re.compile("/dashboard"))
    pg.goto(BASE+"/nominees/sample-artist-1"); pg.wait_for_selector("text=Voting is closed.")
    check("fan sees voting closed after admin closes voting", True)

    # logged-out vote panel
    ctx2 = b.new_context(viewport={"width":390,"height":844}); m = ctx2.new_page()
    m.goto(BASE+"/nominees/sample-artist-1"); m.wait_for_selector("text=Log in to vote.")
    check("signed-out visitor sees log-in-to-vote panel", True)
    m.screenshot(path="/tmp/shots/nominee-mobile.png", full_page=True)

    # ---- mobile screenshots + overflow check on every page
    for path in ["/","/nominees","/leaderboard","/login","/register","/check-email","/email-confirmed","/session-expired","/account-unavailable","/forgot-password","/contact","/terms","/privacy","/refunds","/nominees/sample-artist-3","/this-page-does-not-exist"]:
        for w in (320,390,820):
            ctx3=b.new_context(viewport={"width":w,"height":800}); q=ctx3.new_page(); q.goto(BASE+path); q.wait_for_load_state("networkidle"); q.wait_for_timeout(300)
            sw=q.evaluate("document.documentElement.scrollWidth")
            check(f"no sideways scroll {path} @ {w}", sw<=w, f"scrollWidth {sw}")
            if w==390 and path in ("/","/login","/register","/nominees","/leaderboard"): q.screenshot(path=f"/tmp/shots/m-{path.strip('/') or 'home'}.png", full_page=True)
            ctx3.close()
    b.close()
print("\nconsole errors:", [e for e in errors if 'favicon' not in e][:5])
fails=[r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
