# personal-website

Plain HTML, CSS and JavaScript, served by GitHub Pages. No production build or runtime dependencies.

## Preview and content

Run `npm start` and open http://localhost:8080. Public copy lives in `site-content.json`.
After changing CSS, JavaScript or project entries, run `npm run pages`, then `npm run check`.
Generated project shells should not be edited by hand.

Project entries can include `contribution`, shown on cards and the project page. The shared
label lives in `site.projectsSection.contributionLabel`. A `demoHref` links a case study
back to its demos; its button label lives in `site.projectsSection.demoLabel`.
`featured: true` gives a project a full-width card on desktop home pages. `cardMosaic: true`
uses its first three photos as a card collage. Skill groups can include an `example`
with a label and internal project href to connect the skill list to demonstrated work.

## Browser checks

With Node.js 22 or newer:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

The tests start their own preview on 127.0.0.1:8085. They check desktop and 390px layouts,
light and dark themes, project navigation, the resume link, game dialogs and reduced-motion
timeline navigation. Browser dependencies are for development only; visitors load no third-party scripts.

GitHub Actions runs `npm run check` and the browser suite on pull requests and pushes to
`main`. It validates the committed generated pages without regenerating them first, so stale
pages fail the check. The workflow does not deploy the site.
