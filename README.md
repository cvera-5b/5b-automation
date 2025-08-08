# 5b-automation

**Playwright Automation POC for Five Below's "My Account" QA Project**

---

## 🧪 What is this?

This repository is a **Proof of Concept (POC) / Spike** for setting up a QA Automation Framework using [Playwright](https://playwright.dev/) with **TypeScript**.

Its purpose is to cover the scope of the Jira ticket [MACH-8849](https://fivebelow.atlassian.net/browse/MACH-8849):  
**“QA Automation - Create Framework”**, which focuses on bootstrapping the initial framework for E2E automation around the "My Account" area of the Five Below ecommerce site.

This POC includes:

- ✅ A working Playwright setup
- ✅ TypeScript configuration
- ✅ GitHub Actions CI workflow (tests run on push to `master`)
- ✅ A couple of sample tests (default Playwright scaffolding)
- ✅ Multi-browser execution (Chromium, Firefox, WebKit)

GitHub Actions workflow:  
👉 https://github.com/cvera-5b/5b-automation/actions  
_Example output:_  
```
Running 6 tests using 1 worker
······
  6 passed (9.5s)
```

---

## 📦 Repository Scope

This repo is **not intended to be the final test automation location**. Instead, it serves as:

- A playground to validate that the automation tools work correctly
- A way to confirm GitHub Actions permissions on push
- A permissions test to confirm visibility/access by collaborators
- A technical reference before integration into the actual dev repo

---

## 🔄 Next Steps

This POC will be followed by Jira ticket [MACH-8850](https://fivebelow.atlassian.net/browse/MACH-8850):  
**“[SPIKE] QA Automation - Integration”**, which aims to move this framework into the actual development repository:

👉 https://github.com/frontastic-developers/customer-fivebelow/tree/development-aries-temporal/packages/commerce/frontend

That upcoming step will integrate automation more tightly with the real codebase for the "My Account" section.

---

## 👥 Access & Collaborators

Even though this repo lives under a personal namespace (`https://github.com/cvera-5b/`), it was confirmed that others **can access and view it** without issue.

✅ **Confirmed access by:**
- Jaideep Roby Padam - [@Jaideep170192](https://github.com/Jaideep170192)
- Danny Farrenkopf

This was one of the goals of the POC — to validate collaborator visibility across the org.

---

## 🛑 Why Not in `frontastic-developers`?

Due to current GitHub permission limitations on my user (`cvera-5b`), I was **not able to create a new repository directly under the `frontastic-developers` GitHub organization**.

Once the automation is ready for production integration, the final codebase will live inside the `customer-fivebelow` monorepo, as per ticket MACH-8850.

---

## 🧰 Tech Stack & Setup

- Node.js
- Playwright
- TypeScript
- GitHub Actions (CI)
- Browsers: Chromium, Firefox, WebKit

To install and run locally:

```bash
npm install
npx playwright install
npx playwright test
```

---

## 📁 Folder Structure

```
5b-automation/
├── .github/
│   └── workflows/
│       └── playwright.yml       # GitHub Actions workflow
├── tests/
│   └── example.spec.ts          # Sample Playwright test
├── playwright.config.ts         # Playwright configuration
├── package.json
├── tsconfig.json
└── README.md                    # This file
```

---

## ✍️ Author

**C. Vera**  
QA Automation Engineer @ Five Below  
GitHub: [@cvera-5b](https://github.com/cvera-5b)

---

## 📌 Jira References

- [MACH-8849 – QA Automation - Create Framework](https://fivebelow.atlassian.net/browse/MACH-8849) ✅ *(This repo addresses this ticket)*
- [MACH-8850 – [SPIKE] QA Automation - Integration](https://fivebelow.atlassian.net/browse/MACH-8850) ⏳ *(Next step, not yet implemented here)*
