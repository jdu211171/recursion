# Project Setup and Development Guide

To quickly deploy a new project, we use the npm package `@kirano/starter`. It needs to be installed globally, and this is done only once:

```bash
npm i -g @kirano/starter
```

Next, in the directory where we want to deploy the project, we write:

```bash
kirano create:nuxt honbase
```

Here `honbase` is the name of the project. At this point the setup is complete.

## Stages of Work on the Project

1. **Design review** - Viewing the entire design, assessing the scope of work, discussing the prototype of the site with the designer
2. **Layout** - This also includes adaptive and checking your code
3. **Checking and editing**
4. **Integration with API**
5. **Final edits** - The final stage, after which the project is deployed and given to the client

## File Structure

```
assets/                     # Styles, Fonts, Icons, Pictures
├── fonts/                  # Fonts
├── icons/                  # Icons
└── scss/                   # Styles

components/                 # Components
├── cards/                  # Cards
├── containers/             # Card containers
├── widgets/                # Widgets
├── layout/                 # Template components
├── sections/               # Sections
└── shared/                 # Basic reusable components

composables/                # Hooks
├── useRepositoryData.js    # Hook for getting list of entities
├── useRepositorySingle.js  # Hook for getting a record by ID
└── useSettings.js          # Hook for getting settings

layouts/                    # Page templates
└── default.vue             # Basic template

pages/                      # Pages
└── index.vue               # Home page

plugins/                    # Plugins
└── repositories.js         # Repositories

public/                     # Favicon, public images, robots
├── favicon.ico             # Favicon
├── favicon.svg             # Favicon SVG
├── favicon-96x96.png       # Favicon 96x96
├── site.webmanifest        # Manifesto for PWA
├── web-app-manifest-192x192.png  # Favicon for PWA
└── web-app-manifest-512x512.png  # Favicon for PWA

repositories/               # Repositories
├── index.js                # List of repositories
├── Repository.js           # Base repository
└── SettingRepository.js    # Settings repository

utils/                      # Utilities - assistants
├── passedTime.js           # Has it been X seconds since now?
├── sortObjectAb.js         # Sort object keys alphabetically
└── trans.js                # Gets the current locale value from an object with keys by languages

app.vue                     # Application entry point
nuxt.config.ts              # Nuxt Configuration
```

## Naming Conventions

- All pages and components are lowercase, **kebab-case**
- Hooks in **camelCase**, prefixed with `use`. Example: `useRepositoryData`, `useRepositorySingle`
- Using components in code in **kebab-case**. Example: `sections-hero`, `shared-button`
- Local functions of components/pages tied to events — with the **handle** prefix, as well as in **camelCase**. Example: `handleSubmit`, `handleOpen`

## Import Rules

- Import icons in **camelCase**, with the **Icon** suffix. Example: `StarIcon`, `TimesIcon`
- Import of components in nuxt is automatic, based on file structure, therefore it is not advisable to import components manually. Example: `sections-hero`, `shared-button`
- The composable import in nuxt is automatic, so it is not advisable to import composable manually. Example: `useRepositoryData`, `useRepositorySingle`
- The import of utils into nuxt is automatic, so it is not advisable to import utils manually

## Formats

- All icons in **svg** format
- The format of the mockups is not important
- Images in `/assets/img` must be in **webp** format. At the same time, you need to monitor the quality of the images

## General Rules

- Using the **Composition API** is mandatory
- `/public/assets/img` should only store mock images during development. After connecting the backend, this directory should be cleared
- There should be no extra files in `/assets/scss`, except for those created during the deployment of the project. All styles should be in them/inside components, pages
- Favicon must be generated from svg image of minimum 256x256 px size on realfavicongenerator.net
- Fonts in `/assets/fonts` should be in a directory with the same name as the font, including only the variations used
- You cannot replace icons from the design with emoji/symbols
- SSR cannot be disabled
- All images must have a width/height specified
- Interaction with the API should only be done through repositories
- The icons should be implemented as follows:

```vue
import StarIcon from "@icons/star.svg?raw"
<i v-html="StarIcon" />
```

## Repository Pattern

To simplify and unify work with the API, we use the repository pattern.

The repository pattern is a pattern in which a clear distribution of entities is observed, and a separate class (repository) is assigned through which all work with the entity is carried out (getting a list, getting a single record by identifier).

In addition to repositories linked to entities, it is possible to create and use separate repositories designed to work with actions to save/update state in the database. This could be sending a form, working with authorized user data, etc.

The `repositories.js` plugin is created in the `/plugins` directory, in which the `$repositories` constant containing all available repositories is passed to the application context. The repositories themselves must be located in the `/repositories` directory and extend the `Repository` base class.

Thus, in any part of the application we have the ability to call any of the repository methods:

```vue
const { $repositories } = useNuxtApp()
// Get a list of all articles
const { data: articles } = await $repositories.articles.all()
// Or one by identifier
const { data: article } = await $repositories.articles.show(route.params.id)
```

However, it is also necessary to work with caching the received data, since any such request to the API delays the rendering of the entire page, and we make the user wait. Therefore, we use the built-in composable from nuxt — `useState`. It allows you to store data that will be available during page navigation. Thanks to this approach, we can avoid repeated requests.

The functionality that works effectively with caching is already written, and all we have to do is use it. To do this, we will use composable `useRepositoryData` and `useRepositorySingle`:

```vue
// Get a list of all articles
const { data: articles } = await useRepositoryData('articles')
// Or one by identifier
const { data: article } = await useRepositorySingle('articles', route.params.id)
```

Now, even if we write this code several times in a row, the query will be executed only once.

Let's look at an example with form submission. Here, it will not be possible to use composable, but it is not required, since form submission guarantees that it will be performed only once.

```vue
const { $repositories } = useNuxtApp()
const handleSubmit = async () => {
    await $repositories.applies.submit(formData)
    showSuccessModal()
    clearFormData()
}
```

## DRY

**DRY (Do not repeat yourself)** - Do not repeat yourself. A rule that speaks for itself. If you see in your code that some components are very similar to each other, then you are doing something wrong.

## Using Third-Party Dependencies

- For multilingualism — `nuxt-i18n-micro`
- For animation as you scroll — `nuxt-aos`
- For animation of interaction with DOM — `@formkit/auto-animate`
- For input with a phone number - `intl-tel-input`
- For sliders - `swiper`
- For Google Tag - `nuxt-gtag`
- For Yandex Metrica - `yandex-metrika-module-nuxt3`
- For authorization — `nuxt-auth-sanctum`
- For input of confirmation code — `@venegrad/vue3-code-input`
- To zoom in on images — `@fancyapps/ui`
- For scss - `sass-embedded` *(Dev dependency)*
- Use of other modules without approval is prohibited

## Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User

### **AI Coding Assistant Guidelines**

- **Tools**  
  - Use Bun for package management.  
  - Fix TypeScript errors with `bun run check-errors` after changes.

- **Code Changes**  
  - Modify only relevant code parts.  
  - Preserve formatting, names, and documentation unless specified.  
  - Output complete code if modified.

- **Project Management**  
  - Use TODO.md for tasks, progress, and issues. Update regularly.  
  - At session start: review TODO.md, run `git status`, check recent commits.

- **Git Practices**  
  - Work on main branch with conventional commits.  
  - Run pre-commit checks.  
  - Commit regularly with permission.

- **Development Process**  
  - Plan and discuss approaches before coding.  
  - Make small, testable changes.  
  - Eliminate duplicates.  
  - Log recurring issues in TODO.md.

- **Code Quality**  
  - Handle errors and validate inputs.  
  - Follow conventions and secure secrets.  
  - Write clear, type-safe code.  
  - Remove debug logs before production.

- **Documentation**  
  - Document code structure (components, API routes, utilities, types, assets).

- **Development Standards**  
  - Prioritize simplicity and readability.  
  - Start with minimal working functionality.  
  - Maintain consistent style.