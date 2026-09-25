# Graph Report - /Users/chandyneat/Documents/admin-portal-steelforce  (2026-08-11)

## Corpus Check
- 203 files · ~110,848 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1429 nodes · 3486 edges · 126 communities (67 shown, 59 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.81)
- Token cost: 98,378 input · 0 output

## Community Hubs (Navigation)
- Radix UI Display Primitives
- Reports Feature Pages
- Planning Demo Data & Filters
- Customer & Category List Pages
- Auth Repository, JWT & Device ID
- Product Catalog & Inventory
- Field Activities & Stock Data
- Form Input Primitives
- API Client & Transport Layer
- Notifications & Stop Planning
- Assignment Board & Sales Reps
- Check-In & Customer Drawer
- Planning Shell & Geo Helpers
- Auth Context & Permission Engine
- User Management & Mock Store
- Sidebar Navigation Components
- Google Maps Integration
- TypeScript Build Configuration
- New Customer Form & CRM Data
- Toast Notification System
- Customer Repository Contract
- Customers, Profile & Quotations
- Opportunities Pipeline
- Route Timeline & Status Badges
- Demo Map Canvas & Markers
- Error Pages & Profile Menu
- Alert Dialog, Button & Calendar
- Orders, Header & i18n
- Dashboard Charts & Counters
- Roles & Permissions Admin
- Settings Page & Form Sections
- Package Dependency Manifest
- Login Page & Form
- Portal Layout & Route Guards
- Command Palette & Dialog
- shadcn Component Config
- Mock Seed Data Generators
- Planning Analytics & Chart Theme
- Form Field Bindings
- Carousel Primitive
- Demo Data Model & Project Docs
- Menubar Primitive
- Auth Architecture Rationale
- Chart Container Primitive
- Departments Admin
- Project Scripts Manifest
- Feature Workflow & Ownership Rules
- API Migration Strategy Docs
- Authorization Policy Rationale
- Sheet Primitive
- Root Layout & Theme Provider
- Login History Admin
- App Shell & Sidebar Root
- Breadcrumb Primitive
- Drawer Primitive
- Navigation Menu Primitive
- SteelForce Primary Brand Assets
- Tech Baseline & Release Checklists
- Activity Logs Admin
- Toggle Primitives
- Square App Icon Branding
- Provider Chain & i18n Composition
- Alert Primitive
- ESLint Configuration
- Vercel Deployment Config
- autoprefixer Dependency
- class-variance-authority Dependency
- clsx Dependency
- cmdk Dependency
- date-fns Dependency
- eslint Dependency
- eslint-config-next Dependency
- framer-motion Dependency
- hookform/resolvers Dependency
- lucide-react Dependency
- Netlify Next Plugin Dependency
- Next.js Runtime Config
- Next SWC WASM Dependency
- next-themes Dependency
- postcss Dependency
- Radix Accordion Dependency
- Radix Aspect Ratio Dependency
- Radix Avatar Dependency
- Radix Checkbox Dependency
- Radix Collapsible Dependency
- Radix Context Menu Dependency
- Radix Dialog Dependency
- Radix Dropdown Menu Dependency
- Radix Hover Card Dependency
- Radix Label Dependency
- Radix Menubar Dependency
- Radix Popover Dependency
- Radix Radio Group Dependency
- Radix Scroll Area Dependency
- Radix Separator Dependency
- Radix Slider Dependency
- Radix Slot Dependency
- Radix Switch Dependency
- Radix Toast Dependency
- Radix Toggle Dependency
- Radix Toggle Group Dependency
- Radix Tooltip Dependency
- react Dependency
- react-day-picker Dependency
- react-dom Dependency
- react-hook-form Dependency
- react-resizable-panels Dependency
- React Three Drei Dependency
- React Three Fiber Dependency
- sonner Dependency
- tailwind-merge Dependency
- tailwindcss Dependency
- tailwindcss-animate Dependency
- three Dependency
- Node Types Dependency
- React Types Dependency
- React DOM Types Dependency
- Three Types Dependency
- typescript Dependency
- vaul Dependency
- zod Dependency
- Tailwind Theme Configuration

## God Nodes (most connected - your core abstractions)
1. `cn()` - 203 edges
2. `useI18n()` - 33 edges
3. `Card` - 32 edges
4. `usePlanning()` - 25 edges
5. `formatKm()` - 24 edges
6. `formatCurrency()` - 22 edges
7. `EASE` - 22 edges
8. `RepAvatar()` - 20 edges
9. `useAuth()` - 20 edges
10. `formatDate()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Before opening a pull request checklist` --semantically_similar_to--> `Delivery checks (typecheck, lint, build)`  [INFERRED] [semantically similar]
  cleancode_standart.md → Achitutere.md
- `admin-portal-steelforce project overview` --semantically_similar_to--> `SteelForce Admin Portal`  [INFERRED] [semantically similar]
  README.md → Achitutere.md
- `Client UX route policy with longest-prefix matching` --semantically_similar_to--> `ROUTE_RULES route-to-permission mapping`  [INFERRED] [semantically similar]
  Secuirty.md → Achitutere.md
- `Authorization policy (explicit resource.action permissions)` --semantically_similar_to--> `Permission-first UI checks (useAuth().can / canAny / canAll)`  [INFERRED] [semantically similar]
  Secuirty.md → Achitutere.md
- `Seed records in lib/mock-data.ts` --semantically_similar_to--> `lib/mock-data.ts seed records`  [INFERRED] [semantically similar]
  README.md → Achitutere.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SteelForce client authentication and route-guard flow** — achitutere_authprovider, achitutere_authguard, achitutere_authorize_route, achitutere_route_rules, achitutere_session_store, achitutere_authrepository [EXTRACTED 1.00]
- **Contract-driven API transport boundary layer** — achitutere_api_client, achitutere_api_config, achitutere_api_errors, achitutere_repositories, achitutere_use_repository_query, secuirty_api_client_boundary [EXTRACTED 1.00]
- **Default-deny, permission-first access model across the three blueprints** — achitutere_route_rules, achitutere_permission_checks, secuirty_fail_closed, secuirty_authorization_policy, cleancode_standart_authorization_localization_accessibility [INFERRED 0.85]
- **SteelForce primary logo lockup composition** — public_logos_primary_isi_circular_mark, public_logos_primary_steelforce_wordmark, public_logos_primary_tagline_strength_trust_growth, public_logos_primary_steelforce_primary_logo [EXTRACTED 1.00]
- **ISI square logo visual system (mark, wave motif, brand blue, squircle container)** — public_logos_square_isi_square_logo, public_logos_square_wave_motif, public_logos_square_brand_blue, public_logos_square_squircle_app_icon_format [INFERRED 0.85]

## Communities (126 total, 59 thin omitted)

### Community 0 - "Radix UI Display Primitives"
Cohesion: 0.06
Nodes (52): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardContent, CardDescription (+44 more)

### Community 1 - "Reports Feature Pages"
Cohesion: 0.07
Nodes (40): opts(), PerformanceReportPage(), STATUS_TONE, ChartTip(), opts(), PERIODS, SalesReportPage(), STATUS_TONE (+32 more)

### Community 2 - "Planning Demo Data & Filters"
Cohesion: 0.07
Nodes (41): FilterBar(), opts(), ChipOption, allDistricts, BRAND_PREFIX, BRAND_SUFFIX, buildCustomers(), buildReps() (+33 more)

### Community 3 - "Customer & Category List Pages"
Cohesion: 0.08
Nodes (30): EMPTY_CUSTOMERS, FOLLOW_UP_OPTIONS, MyCustomersPage(), opts(), REVENUE_OPTIONS, BoardView(), EASE, ProductCategoriesPage() (+22 more)

### Community 4 - "Auth Repository, JWT & Device ID"
Cohesion: 0.10
Nodes (26): getDeviceId(), getDeviceName(), asStringArray(), base64UrlDecode(), decodeAccessToken(), DecodedAccessToken, demoPermissionsFor(), ACCOUNTS (+18 more)

### Community 5 - "Product Catalog & Inventory"
Cohesion: 0.11
Nodes (33): InventoryPage(), MOVEMENT_TONE, opts(), STOCK_TONE, opts(), PRICE_BANDS, ProductCatalogPage(), PRODUCT_TONE (+25 more)

### Community 6 - "Field Activities & Stock Data"
Cohesion: 0.09
Nodes (35): DailyActivitiesPage(), EASE, opts(), PRIORITY_TONE, STATUS_TONE, TYPE_ICON, View, VIEWS (+27 more)

### Community 7 - "Form Input Primitives"
Cohesion: 0.06
Nodes (22): Badge(), BadgeProps, badgeVariants, Checkbox, HoverCardContent, Input, InputProps, InputOTP (+14 more)

### Community 8 - "API Client & Transport Layer"
Cohesion: 0.12
Nodes (19): ApiClient, appendQuery(), correlationId(), requestUrl(), responseBody(), apiConfig, hasApiBaseUrl(), ApiError (+11 more)

### Community 9 - "Notifications & Stop Planning"
Cohesion: 0.12
Nodes (14): groups, TodaysStopsPage(), EASE, AssignStopDialog(), OptimizationPanel(), STRATEGY_META, RepPicker(), SectionHeader() (+6 more)

### Community 10 - "Assignment Board & Sales Reps"
Cohesion: 0.17
Nodes (21): AssignmentBoardPage(), RouteRow(), LiveMapPage(), PlanningOverviewPage(), opts(), SalesRepsPage(), RepAvatar(), SIZES (+13 more)

### Community 11 - "Check-In & Customer Drawer"
Cohesion: 0.10
Nodes (20): EASE, VISIT_TONE, ACTIVITY_ICON, STATUS_TONE, Tab, TABS, DrawerPanel(), DrawerPanelProps (+12 more)

### Community 12 - "Planning Shell & Geo Helpers"
Cohesion: 0.15
Nodes (21): PlanSummaryDrawer(), PlanningNav(), TABS, StopDetailDrawer(), customersById, haversineKm(), hhmmToMinutes(), minutesToHHMM() (+13 more)

### Community 13 - "Auth Context & Permission Engine"
Cohesion: 0.12
Nodes (23): AuthContext, AuthContextValue, AuthProvider(), authReducer(), EMPTY_PERMISSIONS, INITIAL_STATE, DEFAULT_ROLE_META, DEMO_ROLE_PERMISSIONS (+15 more)

### Community 14 - "User Management & Mock Store"
Cohesion: 0.17
Nodes (25): generatePassword(), statusStyles, UserDetailPage(), CreateUserPage(), generatePassword(), statusStyles, UsersPage(), activityLogs (+17 more)

### Community 15 - "Sidebar Navigation Components"
Cohesion: 0.14
Nodes (20): anchorFrom(), AnchorRect, EASE, SidebarFlyout(), useFlyout(), EASE, SidebarGroup(), EASE (+12 more)

### Community 16 - "Google Maps Integration"
Cohesion: 0.14
Nodes (23): GoogleStopMap(), MapCanvas(), StopMapProps, SalesRepCardProps, StopCardProps, PHNOM_PENH, DARK_MAP_STYLE, depotPinIcon() (+15 more)

### Community 17 - "TypeScript Build Configuration"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next-prod/types/**/*.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 18 - "New Customer Form & CRM Data"
Cohesion: 0.09
Nodes (25): EASE, EMPTY, Errors, FormState, NewCustomerPage(), StepId, STEPS, validateStep() (+17 more)

### Community 19 - "Toast Notification System"
Cohesion: 0.12
Nodes (24): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+16 more)

### Community 20 - "Customer Repository Contract"
Cohesion: 0.17
Nodes (12): myCustomers(), customersRepository, MockCustomerRepository, CreateCustomerInput, Customer, CustomerListQuery, CustomerRepository, UpdateCustomerInput (+4 more)

### Community 21 - "Customers, Profile & Quotations"
Cohesion: 0.10
Nodes (15): CheckCircle2Icon(), customers, CustomersPage(), tabs, permissions, tabs, approvalLevels, columns (+7 more)

### Community 22 - "Opportunities Pipeline"
Cohesion: 0.14
Nodes (23): DealCard(), EASE, OpportunitiesPage(), opts(), PRIORITY_TONE, STAGE_TONE, CustomerDrawer(), repById() (+15 more)

### Community 23 - "Route Timeline & Status Badges"
Cohesion: 0.18
Nodes (18): RouteTimeline(), TimelineRow(), CreditBadge(), LiveDot(), StatusBadge(), TierBadge(), HISTORY_ICON, depotsById (+10 more)

### Community 24 - "Demo Map Canvas & Markers"
Cohesion: 0.13
Nodes (17): AreaLabels(), DemoMap(), MarkerPopup(), LivePresence(), MapMarker(), MapMarkerProps, SIZE, Bounds (+9 more)

### Community 25 - "Error Pages & Profile Menu"
Cohesion: 0.16
Nodes (11): Home(), EASE, ErrorPage(), EASE, ProfileMenu(), EASE, SidebarFooter(), Portal() (+3 more)

### Community 26 - "Alert Dialog, Button & Calendar"
Cohesion: 0.10
Nodes (20): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+12 more)

### Community 27 - "Orders, Header & i18n"
Cohesion: 0.14
Nodes (17): orders, OrdersPage(), paymentColors, statusColors, statusFilterKeys, statusFilterValues, languages, LanguageSwitcher() (+9 more)

### Community 28 - "Dashboard Charts & Counters"
Cohesion: 0.12
Nodes (16): customerGrowthData, DashboardPage(), ordersData, paymentColors, provinceData, quotationConversion, recentOrders, salesRevenueData (+8 more)

### Community 29 - "Roles & Permissions Admin"
Cohesion: 0.18
Nodes (15): actionLabelKey, PermissionsPage(), RolesPage(), steps, tabs, UserManagementNav(), fetchRoles(), fetchUserCountsByRole() (+7 more)

### Community 30 - "Settings Page & Form Sections"
Cohesion: 0.15
Nodes (16): EASE, LOGIN_HISTORY, SectionId, SECTIONS, SESSIONS, SettingsPage(), controlTone(), EASE (+8 more)

### Community 31 - "Package Dependency Manifest"
Cohesion: 0.11
Nodes (19): embla-carousel-react, input-otp, next, dependencies, embla-carousel-react, input-otp, next, @radix-ui/react-alert-dialog (+11 more)

### Community 32 - "Login Page & Form"
Cohesion: 0.14
Nodes (12): EASE, HIGHLIGHTS, GuestGuard(), EASE, ERROR_COPY, FieldErrors, LoginForm(), validate() (+4 more)

### Community 33 - "Portal Layout & Route Guards"
Cohesion: 0.16
Nodes (13): AuthGuard(), PermissionGuard(), RoleGuard(), SplashScreen(), authorizeRoute(), isPublicRoute(), PUBLIC_ROUTES, ROUTE_RULES (+5 more)

### Community 34 - "Command Palette & Dialog"
Cohesion: 0.12
Nodes (15): Command, CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+7 more)

### Community 35 - "shadcn Component Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 36 - "Mock Seed Data Generators"
Cohesion: 0.15
Nodes (15): activityTemplates, browsers, daysAgo(), devices, hoursAgo(), iso(), locations, now (+7 more)

### Community 37 - "Planning Analytics & Chart Theme"
Cohesion: 0.17
Nodes (11): HOURS, PlanningAnalyticsPage(), TravelLeg(), ChartCard(), LegendItem(), TableColumn, CHART_DARK, CHART_LIGHT (+3 more)

### Community 38 - "Form Field Bindings"
Cohesion: 0.19
Nodes (12): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+4 more)

### Community 39 - "Carousel Primitive"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 40 - "Demo Data Model & Project Docs"
Cohesion: 0.19
Nodes (13): lib/mock-data.ts seed records, lib/mock-store.ts in-memory mutations, Server Components by default, SteelForce Admin Portal, Comments and documentation rules, Data, business logic and forms rules, React and Next.js rules, admin-portal-steelforce project overview (+5 more)

### Community 41 - "Menubar Primitive"
Cohesion: 0.17
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 42 - "Auth Architecture Rationale"
Cohesion: 0.20
Nodes (11): ApiAuthRepository (OAuth2/OpenIddict token endpoint), AuthProvider (session state machine), AuthRepository contract, session-store.ts browser session persistence, StaticAuthRepository (offline demo), SteelForce Clean Code Standard, Discriminated unions for state machines, TypeScript rules (strict, no any, explicit nullability) (+3 more)

### Community 43 - "Chart Container Primitive"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 44 - "Departments Admin"
Cohesion: 0.40
Nodes (9): DepartmentsPage(), DeptForm, emptyForm, createDepartment(), deleteDepartment(), fetchDepartments(), fetchUserCountsByDepartment(), settle() (+1 more)

### Community 45 - "Project Scripts Manifest"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, typecheck (+1 more)

### Community 46 - "Feature Workflow & Ownership Rules"
Cohesion: 0.22
Nodes (9): Adding a feature workflow, Application Map (app/, components/, lib/ layering), Delivery checks (typecheck, lint, build), lib/navigation.ts single navigation source, Recommended ownership rules (concern to location map), Module boundaries and import rules, Naming and file conventions, Local development scripts (+1 more)

### Community 47 - "API Migration Strategy Docs"
Cohesion: 0.36
Nodes (9): lib/api/client.ts authenticated HTTP boundary, lib/api/config.ts API base URL and timeout, lib/api/errors.ts safe error key translation, Contract-driven API migration strategy, lib/repositories contract-neutral repository interfaces, hooks/use-repository-query.ts, Feature repository contract rule (never call fetch directly), lib/api/client.ts as required frontend transport boundary (+1 more)

### Community 48 - "Authorization Policy Rationale"
Cohesion: 0.31
Nodes (9): authorizeRoute (lib/auth/authorization.ts), Permission-first UI checks (useAuth().can / canAny / canAll), ROUTE_RULES route-to-permission mapping, Authorization, localization and accessibility rules, Authorization policy (explicit resource.action permissions), Fail closed / default deny, Object-level access control, Client UX route policy with longest-prefix matching (+1 more)

### Community 49 - "Sheet Primitive"
Cohesion: 0.25
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 50 - "Root Layout & Theme Provider"
Cohesion: 0.32
Nodes (4): metadata, ThemeProvider(), Toaster(), ToasterProps

### Community 51 - "Login History Admin"
Cohesion: 0.36
Nodes (6): formatDuration(), LoginHistoryContent(), statusStyles, fetchLoginHistory(), revokeSession(), LoginHistoryRecord

### Community 52 - "App Shell & Sidebar Root"
Cohesion: 0.32
Nodes (5): AppShell(), Sidebar(), SidebarProps, TRANSITION, useSidebarCollapse()

### Community 53 - "Breadcrumb Primitive"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 54 - "Drawer Primitive"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 55 - "Navigation Menu Primitive"
Cohesion: 0.29
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 56 - "SteelForce Primary Brand Assets"
Cohesion: 0.32
Nodes (8): Admin Portal Branding Asset (public/logos), Brand Palette: royal blue, navy, slate grey on white, ISI Circular Brand Mark, ISI Group (parent organization), SteelForce Primary Logo (horizontal lockup), SteelForce Wordmark, Tagline: STRENGTH. TRUST. GROWTH., Three-Wave Motif under ISI monogram

### Community 57 - "Tech Baseline & Release Checklists"
Cohesion: 0.29
Nodes (7): Technology Baseline (Next.js 13.5 App Router, React 18, TypeScript strict, Tailwind, Radix), Before opening a pull request checklist, Styling standard (Tailwind tokens, card radius token), Content-Security-Policy tuning, Data protection and operations (classification, encryption, retention, backups), Security release checklist, Security headers and browser protections

### Community 58 - "Activity Logs Admin"
Cohesion: 0.38
Nodes (5): ActivityLogsContent(), statusStyles, fetchActivityLogs(), fetchUserDirectory(), ActivityLog

### Community 59 - "Toggle Primitives"
Cohesion: 0.43
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 60 - "Square App Icon Branding"
Cohesion: 0.47
Nodes (6): Admin Portal Branding Asset Role, Brand Blue Primary Color (#2563EB-family), ISI Brand Identity, ISI Square Logo (app icon), Squircle App-Icon Format, Three-Wave Motif

### Community 61 - "Provider Chain & i18n Composition"
Cohesion: 0.40
Nodes (5): AppShell, AuthGuard (single protected boundary), Internationalization (lib/i18n.tsx, en/km common.json), Runtime Composition (RootLayout provider chain), Server-side JWT validation (signature, issuer, audience, exp, nbf, revocation)

### Community 62 - "Alert Primitive"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

## Ambiguous Edges - Review These
- `Vercel deployment (no env vars required)` → `Frontend security rules (secrets, NEXT_PUBLIC_, XSS, open redirects)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **358 isolated node(s):** `extends`, `next/core-web-vitals`, `FOLLOW_UP_OPTIONS`, `REVENUE_OPTIONS`, `EMPTY_CUSTOMERS` (+353 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **59 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Vercel deployment (no env vars required)` and `Frontend security rules (secrets, NEXT_PUBLIC_, XSS, open redirects)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `Radix UI Display Primitives` to `Command Palette & Dialog`, `Form Field Bindings`, `Form Input Primitives`, `Carousel Primitive`, `Notifications & Stop Planning`, `Menubar Primitive`, `Chart Container Primitive`, `Sheet Primitive`, `Toast Notification System`, `Customers, Profile & Quotations`, `Breadcrumb Primitive`, `Drawer Primitive`, `Navigation Menu Primitive`, `Alert Dialog, Button & Calendar`, `Toggle Primitives`, `Alert Primitive`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `Card` connect `Notifications & Stop Planning` to `Radix UI Display Primitives`, `Planning Analytics & Chart Theme`, `Assignment Board & Sales Reps`, `Departments Admin`, `User Management & Mock Store`, `Login History Admin`, `Customers, Profile & Quotations`, `Route Timeline & Status Badges`, `Activity Logs Admin`, `Orders, Header & i18n`, `Dashboard Charts & Counters`, `Roles & Permissions Admin`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `Orders, Header & i18n` to `Customer & Category List Pages`, `Departments Admin`, `User Management & Mock Store`, `Login History Admin`, `App Shell & Sidebar Root`, `Activity Logs Admin`, `Dashboard Charts & Counters`, `Roles & Permissions Admin`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `FOLLOW_UP_OPTIONS` to the rest of the system?**
  _358 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Radix UI Display Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.05792349726775956 - nodes in this community are weakly interconnected._
- **Should `Reports Feature Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06778476589797344 - nodes in this community are weakly interconnected._