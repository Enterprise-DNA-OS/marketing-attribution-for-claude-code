# Privacy evidence checks

Checked 9 November 2026. This system records operational review evidence. It does not certify compliance, establish a lawful basis, or replace a privacy officer's judgment.

| Check | Source and meaning | Implementation |
|---|---|---|
| NZ-IPP1 | [NZ Privacy Principle 1](https://www.privacy.org.nz/privacy-principles/1/) limits collection to a lawful, necessary purpose | Missing account purpose is flagged and excludes its events from attribution |
| NZ-IPP8 | [NZ Privacy Principle 8](https://www.privacy.org.nz/privacy-principles/8/) requires reasonable accuracy checks before use | Unverified events are flagged and excluded until an operator records evidence |
| NZ-IPP9/AU-APP11 | [NZ Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention; [Australian APP 11](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) requires reasonable destruction or de-identification steps when applicable, subject to exceptions | Overdue retention-review dates are flagged and exclude events. Nothing is automatically deleted |
| LOCAL-REVIEW | Business policy, not a statutory deadline | Missing owner or overdue purpose review creates a finding and an overdue purpose review excludes events |

Dates are chosen by the business, not prescribed statutory periods. APP obligations depend on whether the organisation is an APP entity. Legal retention duties and holds require human assessment. Review raw imports, exports, backups, drafts and generated documents as well as database records. The tool cannot locate every copy.

Names, emails and identifiers in raw exports can be personal information. Restrict filesystem and database access, use encrypted storage, and never commit production files. A green check means only that these selected fields passed. Purpose text and an operator's evidence note do not prove consent or lawful use. No email or ad audience is sent.
