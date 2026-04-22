import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  adminCancelOrder,
  adminCreateProduct,
  adminDeleteUser,
  adminDeleteOrder,
  adminDeleteProduct,
  adminDownloadOrderTxt,
  adminGetOrders,
  adminGetProducts,
  adminGetUsers,
  adminSetOrderStatus,
  adminSetProductPublish,
  adminUpdateProduct,
  adminUpdateUser,
  adminUploadProductImage,
  type AdminProductPayload,
  type AdminUser,
} from './api/admin'
import { addToCart, getCart, removeCartItem, updateCartItem, type CartItem } from './api/cart'
import { addFavorite, getFavorites, removeFavorite } from './api/favorites'
import {
  getCategories,
  getProducts,
  searchProducts,
  type CatalogCategory,
  type CatalogProduct,
  type CatalogProductColorVariant,
} from './api/catalog'
import {
  createOrder,
  getMyOrders,
  type ApiOrder,
  type ApiOrderStatus,
} from './api/orders'
import { patchMe } from './api/auth'
import { confirmLoginCode, restoreSession, sendLoginCode, signOut } from './lib/authFlow'
import { useAuthStore } from './store/authStore'
import { resolveProductImageUrl } from './api/client'
import brayeLipsleekVariantsJson from './data/braye-lipsleek-variants.json'
import './App.css'

function productImageCssUrl(imageUrl: string | null | undefined): string {
  return resolveProductImageUrl(imageUrl, '/krem1.png')
}

const CATEGORIES = ['Основной уход', 'Макияж', 'Волосы', 'Тело'] as const
type Category = (typeof CATEGORIES)[number]
type CatalogFilter =
  | { mode: 'all' }
  | {
      mode: 'subcategory'
      category: string
      subcategory: string
    }
  | null

const CATALOG_GRID_DATA_ROWS = 7

const SUBCATEGORY_ITEM_X_PX = 14

const PRODUCT_FIGMA_TEXT_SLIDE_PX = 1056

function productTabSlideIndex(tab: 'description' | 'characteristics' | 'composition'): number {
  if (tab === 'description') return 0
  if (tab === 'characteristics') return 1
  return 2
}

type SubcategoryConfig = {
  titleX: number
  titleY: number
  items: Array<{ label: string }>
  title: string
  panelWidth: number
  panelHeight: number
  panelTop: number
}

const SUBCATEGORY_MAP: Record<Category, SubcategoryConfig> = {
  Тело: {
    titleX: 11,
    titleY: 14,
    items: [
      { label: 'Для душа' },
      { label: 'Уход' },
      { label: 'Гигиена' },
      { label: 'Для рук' },
      { label: 'Для ног' },
    ],
    title: 'Тело',
    panelWidth: 351,
    panelHeight: 420,
    panelTop: 0,
  },
  Волосы: {
    titleX: 11,
    titleY: 14,
    items: [
      { label: 'Шампуни' },
      { label: 'Кондиционеры' },
      { label: 'Уход для волос' },
      { label: 'Стайлинг' },
    ],
    title: 'Волосы',
    panelWidth: 351,
    panelHeight: 360,
    panelTop: 0,
  },
  Макияж: {
    titleX: 9,
    titleY: 14,
    items: [{ label: 'Для лица' }, { label: 'Для глаз' }, { label: 'Для губ и бровей' }],
    title: 'Макияж',
    panelWidth: 259,
    panelHeight: 300,
    panelTop: 0,
  },
  'Основной уход': {
    titleX: 11,
    titleY: 14,
    items: [
      { label: 'Очищение' },
      { label: 'Пилинги' },
      { label: 'Тонизирование' },
      { label: 'Увлажнение' },
      { label: 'Направленный уход' },
      { label: 'Защита от солнца' },
      { label: 'Маски' },
    ],
    title: 'Основной уход',
    panelWidth: 384,
    panelHeight: 550,
    panelTop: 0,
  },
}

const CATALOG_SUB_COLUMN_MIN_WIDTH_PX = Math.max(
  ...CATEGORIES.map((c) => SUBCATEGORY_MAP[c].panelWidth),
)

function parsePhoneNational10(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('8')) d = '7' + d.slice(1)
  if (d.startsWith('7')) d = d.slice(1)
  return d.slice(0, 10)
}

function formatRuPhoneDisplay(national10: string): string {
  const d = national10.replace(/\D/g, '').slice(0, 10)
  if (!d.length) return ''
  let out = '+7 ('
  out += d.slice(0, Math.min(3, d.length))
  if (d.length <= 3) return out
  out += ') ' + d.slice(3, Math.min(6, d.length))
  if (d.length <= 6) return out
  out += '-' + d.slice(6, Math.min(8, d.length))
  if (d.length <= 8) return out
  out += '-' + d.slice(8, 10)
  return out
}

function formatIsoDateRu(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  if (!y || !m || !d) return iso
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`
}

type SearchSuccessColorVariant = {
  id: string
  hex: string
  label?: string
  /** Круглый свотч: фото панели оттенка (как в макете бренда), иначе заливка `hex` */
  swatchImageUrl?: string
  imageUrl?: string
  imageClassName?: string
  price?: string
  stock?: number
  productId?: number
}

/** Демо и сид: оттенки (id, label, hex) из `src/data/braye-lipsleek-variants.json` — круги на карточке; главное фото — `imageUrl` товара. */
const BRAYE_LIPSLEEK_COLOR_VARIANTS = brayeLipsleekVariantsJson as SearchSuccessColorVariant[]

function coerceCatalogColorVariantEntry(entry: unknown): CatalogProductColorVariant | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  const o = entry as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : ''
  const hex = typeof o.hex === 'string' ? o.hex : ''
  if (!id || !hex) return null
  return {
    id,
    hex,
    label: typeof o.label === 'string' ? o.label : undefined,
    swatchImageUrl: typeof o.swatchImageUrl === 'string' ? o.swatchImageUrl : undefined,
    imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined,
    imageClassName: typeof o.imageClassName === 'string' ? o.imageClassName : undefined,
    price: typeof o.price === 'string' ? o.price : undefined,
    stock: typeof o.stock === 'number' && Number.isFinite(o.stock) ? o.stock : undefined,
    productId: typeof o.productId === 'number' && Number.isFinite(o.productId) ? o.productId : undefined,
  }
}

/** Для карточки/поиска: несколько оттенков (2+), иначе без переключателя. */
function normalizeCatalogColorVariants(raw: unknown): SearchSuccessColorVariant[] | undefined {
  if (!raw || !Array.isArray(raw) || raw.length < 2) return undefined
  const out: SearchSuccessColorVariant[] = []
  for (const entry of raw) {
    const v = coerceCatalogColorVariantEntry(entry)
    if (v) out.push(v)
  }
  return out.length > 1 ? out : undefined
}

/** Для сохранения в админке: как минимум один валидный объект (как на бэкенде). */
function normalizeColorVariantsArrayLoose(parsed: unknown): CatalogProductColorVariant[] {
  if (!Array.isArray(parsed)) {
    throw new Error('Оттенки: нужен JSON-массив объектов { id, hex, … }')
  }
  const out: CatalogProductColorVariant[] = []
  for (const entry of parsed) {
    const v = coerceCatalogColorVariantEntry(entry)
    if (v) out.push(v)
  }
  if (out.length === 0) {
    throw new Error('В массиве нет ни одного объекта с непустыми id и hex')
  }
  return out
}

function parseAdminColorVariantsField(text: string): CatalogProductColorVariant[] | null {
  const trimmed = text.trim()
  if (trimmed === 'null') return null
  const parsed: unknown = JSON.parse(trimmed)
  return normalizeColorVariantsArrayLoose(parsed)
}

const SEARCH_SUCCESS_ITEMS = [
  {
    id: 'search-1',
    title: 'Крем для лица',
    productName: 'Успокаивающий крем с ПДРН и пептидами Arencia Deep Water Surge Soothing Cream',
    description: 'Успокаивающий крем с ПДРН и пептидами Arencia Deep Water Surge Soothing Cream',
    detailsText:
      'Крем с ПДРН и пептидами Arencia Deep Water Surge Soothing Cream интенсивно увлажняет и успокаивает раздражённую кожу, охлаждает. Восстанавливает повреждённые участки, усиливает защитные функции и поддерживает эластичность тканей.\n\nПродукт мягко отшелушивает и препятствует образованию комедонов, выравнивает текстуру и смягчает огрубевшие участки.\n\nОбладает лёгкой тающей консистенцией и быстро впитывается. Можно использовать в качестве маски, чтобы быстро устранить покраснение и зуд.\n\nОсновные действующие компоненты:\nCica PDRN™ (Hydrolyzed DNA, Centella Asiatica Extract) — комплекс на основе ПДРН и экстракта центеллы азиатской. Стимулирует клеточное восстановление, за счёт чего ускоряет регенерацию, препятствует образованию морщин, поддерживает упругость и плотность.\n5 пептидов (Tripeptide-1, Acetyl Hexapeptide-8, Copper Tripeptide-1, Palmitoyl Pentapeptide-4, Hexapeptide-9) способствуют выработке коллагена и эластина, разглаживают, уменьшают выраженность заломов. Пептид аргелирин способствует расслаблению мышц лица, тем самым препятствует появлению мимических морщин.\nЦерамиды восстанавливают целостность рогового слоя, укрепляют естественный барьер, снижают чувствительность к внешним раздражителям, устраняют шелушение и сухость.\n3 вида гиалуроновой кислоты с разной молекулярной массой: молекулы с высокой массой восстанавливают защитный барьер на поверхности кожи, ускоряют заживление и уменьшают шелушение. Молекулы с низкой массой обладают высокой проникающей способностью, они предотвращают потерю влаги на клеточном уровне.\nКомплекс энзимов деликатно отшелушивает, очищает поры, осветляет, выравнивает общий тон, борется с акне и чёрными точками.\nПодходит для всех типов кожи.\n\nСпособ применения: после очищения, тонизирования и использования сыворотки нанесите крем на лицо, распределите по коже.',
    characteristicsText:
      'Производитель: Arencia\nАктивные компоненты: ПДРН (PDRN), Центелла азиатская, Энзимы, Гиалуроновая кислота, Пептиды\nОбъём (мл): 80\nТип кожи: для нормальной кожи, для сухой кожи, для жирной кожи, для комбинированной кожи, для чувствительной кожи, для проблемной кожи\nСтрана: Южная Корея',
    compositionText:
      'Water, Glycerin, C18-21 Alkane, 1,2-Hexanediol, Niacinamide, Jojoba Seed Oil, Polyglyceryl-3 Methylglucose Distearate, Butylene Glycol, Panthenol, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Ceramide NP, Sodium DNA, Tripeptide-1, Acetyl Hexapeptide-8, Copper Tripeptide-1, Palmitoyl Pentapeptide-4, Hexapeptide-9, Aloe Vera Leaf Extract, Green Tea Extract, Rice Bran Extract, Chamomile Flower Extract, Sodium Carbomer, Hydroxyacetophenone, Ethylhexylglycerin, Adenosine, Trisodium Ethylenediamine Disuccinate, Hydrogenated Lecithin, Malachite Extract, Arginine, PEG-10 Rapeseed Sterol, Dipropylene Glycol, Rice Extract, Glyceryl Stearate, Glyceryl Stearate SE, Tocopherol, Lactobacillus/Rice Ferment Filtrate, Caprylyl Glycol, Centella Asiatica Extract, Disodium EDTA, Bromelain, Oryzanol, Papain, Protease, Lipase, Kojic Dipalmitate',
    volume: '80 мл',
    price: '2 750 ₽',
    imageUrl: '/krem1.png',
    imageClassName: '',
    cardClassName: '',
    priceClassName: '',
  },
  {
    id: 'search-2',
    title: 'Крем для лица',
    productName: 'Успокаивающий крем с ресвератролом Dr. Althea 345 Relief Cream',
    description: 'Успокаивающий крем с ресвератролом Dr. Althea 345 Relief Cream',
    detailsText:
      'Крем Dr. Althea 345 Relief Cream помогает успокоить чувствительную кожу, уменьшает покраснение и поддерживает защитный барьер.\n\nЛегкая текстура комфортно распределяется и быстро впитывается без липкости. Подходит для ежедневного ухода.',
    characteristicsText:
      'Производитель: Dr. Althea\nОбъём (мл): 50\nТип кожи: для всех типов кожи\nСтрана: Южная Корея',
    compositionText: 'Состав уточняется производителем.',
    volume: '50 мл',
    price: '2 950 ₽',
    imageUrl: '/krem2.png',
    imageClassName: ' is-second',
    cardClassName: ' is-second',
    priceClassName: ' is-second',
  },
  {
    id: 'search-braye',
    title: 'Макияж',
    productName: 'Компактный вельветовый бальзам для губ и щёк BRAYE',
    description: 'Компактный вельветовый бальзам для губ и щёк BRAYE',
    detailsText:
      'Вельветовая текстура бальзама BRAYE мягко пигментирует губы и щёки, даёт ровное покрытие и комфорт в течение дня. Компактный формат удобно носить с собой.',
    characteristicsText:
      'Производитель: BRAYE\nЛинейка: LIPSLEEK (лип-бальзам для губ и щёк)\nОбъём: 2,3 г\nОттенки: 01 ARDOR, 02 RORTY, 03 POSH, 04 SAVVY, 05 EASE, 06 PLUCKY, 07 BOLDNESS, 08 ROUGHLY, 09 COOLNESS, 10 CLEAR\nСтрана: Южная Корея',
    compositionText: 'Состав уточняется на упаковке.',
    volume: '2,3 г',
    price: '1 800 ₽',
    imageUrl: '/krem1.png',
    imageClassName: '',
    cardClassName: '',
    priceClassName: '',
    colorVariants: BRAYE_LIPSLEEK_COLOR_VARIANTS,
  },
]

type SearchSuccessItem = {
  id: string
  productId?: number
  stock?: number
  title: string
  productName: string
  description: string
  detailsText: string
  characteristicsText: string
  compositionText: string
  volume: string
  price: string
  imageUrl?: string
  imageClassName: string
  cardClassName: string
  priceClassName: string
  colorVariants?: SearchSuccessColorVariant[]
}
type AppView = 'home' | 'catalog-list'

function formatPrice(price: number) {
  return `${price.toLocaleString('ru-RU')} ₽`
}

function parseOrderTotalRub(totalAmount: string): number {
  const s = String(totalAmount).trim().replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const LOYALTY_TIER_THRESHOLDS_DESC = [
  { minRub: 30_000, percent: 30 },
  { minRub: 15_000, percent: 15 },
  { minRub: 10_000, percent: 10 },
  { minRub: 5_000, percent: 5 },
  { minRub: 3_000, percent: 3 },
] as const

function loyaltyPercentFromBuyoutTotal(totalRub: number): number {
  for (const tier of LOYALTY_TIER_THRESHOLDS_DESC) {
    if (totalRub >= tier.minRub) return tier.percent
  }
  return 0
}

const LOYALTY_MILESTONE_ROWS: { rub: number; percent: number }[] = [
  { rub: 3_000, percent: 3 },
  { rub: 5_000, percent: 5 },
  { rub: 10_000, percent: 10 },
  { rub: 15_000, percent: 15 },
  { rub: 30_000, percent: 30 },
]

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}

function mapOrderStatus(status: ApiOrderStatus) {
  switch (status) {
    case 'NEW':
    case 'CONFIRMED':
      return 'Оформлен'
    case 'IN_PROGRESS':
    case 'SHIPPED':
      return 'В сборке'
    case 'COMPLETED':
    case 'CANCELLED':
      return 'Готов'
    default:
      return 'Оформлен'
  }
}

type CheckoutFormState = {
  firstName: string
  lastName: string
  phone: string
  email: string
  city: string
  street: string
  apartment: string
  entrance: string
  intercom: string
  floor: string
  comment: string
}

const CHECKOUT_FORM_EMPTY: CheckoutFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  city: '',
  street: '',
  apartment: '',
  entrance: '',
  intercom: '',
  floor: '',
  comment: '',
}

function formatOrderDeliverySummary(order: ApiOrder): string {
  const extra = [order.apartment, order.entrance, order.floor, order.intercom].filter(
    (x) => x != null && String(x).trim() !== '',
  ) as string[]
  const extraStr = extra.length ? extra.join(', ') : ''
  const parts = [
    order.fullName,
    order.phone,
    order.email,
    order.city ? `г. ${order.city}` : '',
    order.addressLine,
    extraStr,
    order.promoCode?.trim() ? `промокод: ${order.promoCode.trim()}` : '',
  ].filter((p) => p && String(p).trim())
  let line = parts.join(' · ')
  if (order.comment?.trim()) line += ` — ${order.comment.trim()}`
  return line
}

const ADMIN_ORDER_STATUSES: ApiOrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'IN_PROGRESS',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]

function orderStatusLabelRu(status: ApiOrderStatus): string {
  switch (status) {
    case 'NEW':
      return 'Новый'
    case 'CONFIRMED':
      return 'Подтверждён'
    case 'IN_PROGRESS':
      return 'В работе'
    case 'SHIPPED':
      return 'Отправлен'
    case 'COMPLETED':
      return 'Завершён'
    case 'CANCELLED':
      return 'Отменён'
    default:
      return status
  }
}

const DEFAULT_PRODUCT_TAB_DESCRIPTION = 'Описание'
const DEFAULT_PRODUCT_TAB_CHARACTERISTICS = 'Характеристики'
const DEFAULT_PRODUCT_TAB_COMPOSITION = 'Состав'

const PRODUCT_FORM_INITIAL: AdminProductPayload = {
  name: '',
  slug: '',
  categoryId: undefined,
  subcategory: '',
  manufacturer: '',
  price: 0,
  stock: 0,
  imageUrl: '',
  description: '',
  usage: '',
  activeComponents: '',
  weightGr: null,
  country: '',
  barcode: '',
  characteristics: '',
  composition: '',
  isPublished: true,
}

function formatProductCountRu(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return `${n} продуктов`
  if (mod10 === 1) return `${n} продукт`
  if (mod10 >= 2 && mod10 <= 4) return `${n} продукта`
  return `${n} продуктов`
}

function formatCartVolumeMl(product: CatalogProduct): string | null {
  const fromChars = product.characteristics?.match(/Объ[её]м\s*\(\s*мл\s*\)\s*:\s*(\d+)/i)
  if (fromChars?.[1]) return `${fromChars[1]} мл`
  if (product.weightGr != null) return `${product.weightGr} мл`
  return null
}

function mapProductToSearchItem(product: CatalogProduct): SearchSuccessItem {
  const categoryName = product.category?.name ?? 'Каталог'
  const characteristicsFromFields = [
    product.manufacturer ? `Производитель: ${product.manufacturer}` : null,
    product.activeComponents ? `Активные компоненты: ${product.activeComponents}` : null,
    product.weightGr ? `Вес (гр): ${product.weightGr}` : null,
    product.country ? `Страна: ${product.country}` : null,
    product.barcode ? `Штрихкод: ${product.barcode}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const base: SearchSuccessItem = {
    id: `product-${product.id}`,
    productId: product.id,
    title: product.subcategory || categoryName,
    productName: product.name,
    description: product.name,
    detailsText: [product.description, product.usage ? `\n\nСпособ применения: ${product.usage}` : null]
      .filter(Boolean)
      .join('') || 'Описание скоро будет добавлено.',
    characteristicsText:
      product.characteristics ||
      characteristicsFromFields ||
      `Категория: ${categoryName}\nОстаток: ${product.stock} шт`,
    compositionText: product.composition || 'Состав уточняется производителем.',
    volume: product.weightGr ? `${product.weightGr} гр` : '1 шт',
    price: formatPrice(Number(product.price)),
    stock: product.stock,
    imageUrl: product.imageUrl || '/krem1.png',
    imageClassName: '',
    cardClassName: '',
    priceClassName: '',
  }

  const colorVariants = normalizeCatalogColorVariants(product.colorVariants)
  if (colorVariants) {
    return {
      ...base,
      colorVariants,
    }
  }

  return base
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('home')
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>(null)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [hoveredSubItem, setHoveredSubItem] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'code'>('login')
  const [authReturnMode, setAuthReturnMode] = useState<'login' | 'register'>('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginEmailError, setLoginEmailError] = useState(false)
  const [codeDigits, setCodeDigits] = useState(['', '', '', ''])
  const [codeStatus, setCodeStatus] = useState<'idle' | 'error' | 'success'>('idle')
  const [authCodeResendRemainingSec, setAuthCodeResendRemainingSec] = useState(0)
  const authUser = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileTab, setProfileTab] = useState<
    'loyalty' | 'details' | 'orders' | 'support' | 'admin' | 'logout'
  >('loyalty')
  const [ordersView, setOrdersView] = useState<'active' | 'completed'>('active')
  const [profileName, setProfileName] = useState('')
  const [profileSurname, setProfileSurname] = useState('')
  const [profileDetailsSaveLoading, setProfileDetailsSaveLoading] = useState(false)
  const [profileDetailsSaveFeedback, setProfileDetailsSaveFeedback] = useState<string | null>(null)
  const [registrationName, setRegistrationName] = useState('')
  const [registrationGender, setRegistrationGender] = useState<'female' | 'male' | ''>('')
  const [registrationBirthday, setRegistrationBirthday] = useState('')
  const [registrationPhone, setRegistrationPhone] = useState('')
  const [registrationNameError, setRegistrationNameError] = useState(false)
  const [registrationGenderError, setRegistrationGenderError] = useState(false)
  const [registrationBirthdayError, setRegistrationBirthdayError] = useState(false)
  const [registrationPhoneError, setRegistrationPhoneError] = useState(false)
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<
    | 'favorites-empty'
    | 'favorites-full'
    | 'cart-empty'
    | 'cart-full'
    | 'checkout'
    | 'order-success'
    | 'search-success'
    | 'search-empty'
    | 'product-card'
    | null
  >(null)
  const panelBeforeProductRef = useRef<
    | 'favorites-empty'
    | 'favorites-full'
    | 'cart-empty'
    | 'cart-full'
    | 'checkout'
    | 'order-success'
    | 'search-success'
    | 'search-empty'
    | null
  >(null)
  const [selectedSearchItem, setSelectedSearchItem] = useState<SearchSuccessItem | null>(null)
  const [productTab, setProductTab] = useState<'description' | 'characteristics' | 'composition'>('description')
  const [productQtyById, setProductQtyById] = useState<Record<string, number>>({})
  const [productCardVariantId, setProductCardVariantId] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchSuccessItem[]>(SEARCH_SUCCESS_ITEMS)
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoading, setCartLoading] = useState(false)
  const [favoriteProducts, setFavoriteProducts] = useState<CatalogProduct[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersReady, setOrdersReady] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(CHECKOUT_FORM_EMPTY)
  const [adminTab, setAdminTab] = useState<'products' | 'orders' | 'users'>('products')
  const [adminProducts, setAdminProducts] = useState<CatalogProduct[]>([])
  const [adminProductsLoading, setAdminProductsLoading] = useState(false)
  const [adminOrders, setAdminOrders] = useState<ApiOrder[]>([])
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [adminProductForm, setAdminProductForm] = useState<AdminProductPayload>(PRODUCT_FORM_INITIAL)
  const [adminProductColorVariantsJson, setAdminProductColorVariantsJson] = useState('')
  const [adminUserForm, setAdminUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    role: 'USER' as 'USER' | 'ADMIN',
  })
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [adminPhotoUploading, setAdminPhotoUploading] = useState(false)
  const adminPhotoInputRef = useRef<HTMLInputElement>(null)
  const authCodeInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])
  const [adminCategories, setAdminCategories] = useState<CatalogCategory[]>([])
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cartItems],
  )

  const activeSubcategory = activeCategory ? SUBCATEGORY_MAP[activeCategory] : null
  const profileDisplayName = [profileName.trim(), profileSurname.trim()].filter(Boolean).join(' ')
  const profileEmail = authUser?.email || loginEmail || 'Не указана'
  const profilePhone =
    authUser?.phone != null && String(authUser.phone).trim() !== ''
      ? String(authUser.phone).trim()
      : registrationPhone || 'Не указано'
  const profileBirthday = authUser?.dateOfBirth
    ? formatIsoDateRu(String(authUser.dateOfBirth).slice(0, 10))
    : registrationBirthday
      ? formatIsoDateRu(registrationBirthday)
      : 'Не указана'
  const filteredCatalogItems = useMemo(() => {
    if (!catalogFilter) return []
    if (catalogFilter.mode === 'all') {
      return allProducts.map(mapProductToSearchItem)
    }
    return allProducts
      .filter(
        (product) =>
          product.category.name === catalogFilter.category &&
          (product.subcategory || '').toLowerCase() === catalogFilter.subcategory.toLowerCase(),
      )
      .map(mapProductToSearchItem)
  }, [allProducts, catalogFilter])
  const isPanelLogoVisible = Boolean(activeHeaderPanel) || activeView === 'catalog-list'
  const favoriteItems = useMemo(
    () => favoriteProducts.map(mapProductToSearchItem),
    [favoriteProducts],
  )
  const isProductFavorite = (productId: number | undefined) =>
    Boolean(productId && favoriteProducts.some((p) => p.id === productId))
  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED'),
    [orders],
  )
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'COMPLETED' || order.status === 'CANCELLED'),
    [orders],
  )
  const loyaltyBuyoutTotalRub = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + parseOrderTotalRub(o.totalAmount), 0),
    [orders],
  )
  const loyaltyDiscountPercent = useMemo(
    () => loyaltyPercentFromBuyoutTotal(loyaltyBuyoutTotalRub),
    [loyaltyBuyoutTotalRub],
  )
  const hasAnyOrders = orders.length > 0
  const isAdmin = authUser?.role === 'ADMIN'
  const productCardDisplay = useMemo(() => {
    const item = selectedSearchItem
    if (!item) return null
    const variants = item.colorVariants
    const hasColorChoice = Boolean(variants && variants.length > 1)
    const selectedVariant =
      hasColorChoice && variants
        ? variants.find((v) => v.id === productCardVariantId) ?? variants[0]
        : null
    const displayImageUrl = item.imageUrl
    const displayImageClassName = item.imageClassName
    const displayPrice = selectedVariant?.price ?? item.price
    const displayStock = selectedVariant?.stock ?? item.stock
    const displayProductId = selectedVariant?.productId ?? item.productId
    const cartQtyKey = displayProductId != null ? `product-${displayProductId}` : item.id
    return {
      item,
      hasColorChoice,
      colorVariants: variants ?? [],
      selectedVariant,
      displayImageUrl,
      displayImageClassName,
      displayPrice,
      displayStock,
      displayProductId,
      cartQtyKey,
    }
  }, [selectedSearchItem, productCardVariantId])
  const openProductCard = (item: SearchSuccessItem) => {
    setActiveHeaderPanel((prev) => {
      if (prev !== 'product-card') {
        panelBeforeProductRef.current = prev
      }
      return 'product-card'
    })
    setSelectedSearchItem(item)
    const cv = item.colorVariants
    setProductCardVariantId(cv && cv.length > 1 ? cv[0].id : null)
    setProductTab('description')
  }
  const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  const birthdayInputMax = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const clearRegisterFieldErrors = () => {
    setRegistrationNameError(false)
    setRegistrationGenderError(false)
    setRegistrationBirthdayError(false)
    setRegistrationPhoneError(false)
  }
  const adminResetForm = () => {
    setEditingProductId(null)
    setAdminProductForm(PRODUCT_FORM_INITIAL)
    setAdminProductColorVariantsJson('')
  }
  const adminResetUserForm = () => {
    setEditingUserId(null)
    setAdminUserForm({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      role: 'USER',
    })
  }
  const adminLoadProducts = async () => {
    setAdminProductsLoading(true)
    try {
      const list = await adminGetProducts()
      setAdminProducts(list)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Не удалось загрузить товары')
    } finally {
      setAdminProductsLoading(false)
    }
  }
  const adminLoadOrders = async () => {
    setAdminOrdersLoading(true)
    try {
      const list = await adminGetOrders()
      setAdminOrders(list)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Не удалось загрузить заказы')
    } finally {
      setAdminOrdersLoading(false)
    }
  }
  const adminLoadUsers = async () => {
    setAdminUsersLoading(true)
    try {
      const list = await adminGetUsers()
      setAdminUsers(list)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Не удалось загрузить пользователей')
    } finally {
      setAdminUsersLoading(false)
    }
  }
  const adminStartEditProduct = (product: CatalogProduct) => {
    setEditingProductId(product.id)
    setAdminProductForm({
      name: product.name,
      slug: product.slug,
      categoryId: product.category.id,
      subcategory: product.subcategory || '',
      manufacturer: product.manufacturer || '',
      price: Number(product.price),
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      description: product.description || '',
      usage: product.usage || '',
      activeComponents: product.activeComponents || '',
      weightGr: product.weightGr,
      country: product.country || '',
      barcode: product.barcode || '',
      characteristics: product.characteristics || '',
      composition: product.composition || '',
      isPublished: product.isPublished,
    })
    setAdminProductColorVariantsJson(
      product.colorVariants != null ? JSON.stringify(product.colorVariants, null, 2) : '',
    )
  }
  const adminStartEditUser = (user: AdminUser) => {
    setEditingUserId(user.id)
    setAdminUserForm({
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
      role: user.role,
    })
  }
  const openLoginModal = () => {
    setIsCatalogOpen(false)
    setActiveView((v) => (v === 'catalog-list' ? 'home' : v))
    setActiveHeaderPanel(null)
    setIsAuthModalOpen(true)
    setAuthMode('login')
    setAuthCodeResendRemainingSec(0)
    setLoginEmail('')
    setLoginEmailError(false)
    setCodeDigits(['', '', '', ''])
    setCodeStatus('idle')
    setAuthErrorMessage(null)
    setRegistrationName('')
    setRegistrationGender('')
    setRegistrationBirthday('')
    setRegistrationPhone('')
    clearRegisterFieldErrors()
  }

  const goToMainFromProfile = () => {
    setIsProfileOpen(false)
    setProfileTab('loyalty')
    setActiveHeaderPanel(null)
    setSearchQuery('')
    setActiveView('home')
    setActiveCategory(null)
    setHoveredSubItem(null)
    setIsCatalogOpen(false)
  }

  const performLogoutAndCloseProfile = async () => {
    await signOut()
    setIsProfileOpen(false)
    setIsCatalogOpen(false)
    setProfileTab('loyalty')
    setActiveHeaderPanel(null)
    setActiveView('home')
    setActiveCategory(null)
    setHoveredSubItem(null)
  }

  const storePanelRef = useRef(activeHeaderPanel)
  storePanelRef.current = activeHeaderPanel

  const closeProductCard = () => {
    const back = panelBeforeProductRef.current
    panelBeforeProductRef.current = null
    setSelectedSearchItem(null)
    setActiveHeaderPanel(back)
  }

  const closeStorePanel = () => {
    const p = storePanelRef.current
    if (p === 'product-card') {
      closeProductCard()
      return
    }
    if (p === 'search-success' || p === 'search-empty') {
      setSearchQuery('')
    }
    setActiveHeaderPanel(null)
  }

  const dismissAllStorePanelsForMenu = () => {
    panelBeforeProductRef.current = null
    setSelectedSearchItem(null)
    if (storePanelRef.current === 'search-success' || storePanelRef.current === 'search-empty') {
      setSearchQuery('')
    }
    setActiveHeaderPanel(null)
  }

  const formatAuthCodeCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleResendAuthCode = async () => {
    if (isAuthLoading || authCodeResendRemainingSec > 0) return
    try {
      setIsAuthLoading(true)
      setAuthErrorMessage(null)
      setCodeStatus('idle')
      await sendLoginCode(loginEmail, authReturnMode === 'login' ? 'login' : 'signup')
      setCodeDigits(['', '', '', ''])
      setAuthCodeResendRemainingSec(60)
      window.setTimeout(() => authCodeInputRefs.current[0]?.focus(), 0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось отправить код'
      setAuthErrorMessage(msg)
    } finally {
      setIsAuthLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthModalOpen || authMode !== 'code') return
    const id = window.setInterval(() => {
      setAuthCodeResendRemainingSec((sec) => Math.max(0, sec - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isAuthModalOpen, authMode])

  useEffect(() => {
    if (!isAuthModalOpen) setAuthCodeResendRemainingSec(0)
  }, [isAuthModalOpen])

  const handleConfirmAuthCode = async () => {
    if (isAuthLoading) return
    const code = codeDigits.join('')
    if (code.length !== 4) {
      setCodeStatus('error')
      setAuthErrorMessage(null)
      return
    }
    try {
      setIsAuthLoading(true)
      setAuthErrorMessage(null)
      const user = await confirmLoginCode(loginEmail, code)
      setProfileName(user.firstName?.trim() || registrationName.trim())
      setProfileSurname(user.lastName?.trim() || '')
      setCodeStatus('success')
      setIsAuthModalOpen(false)
      setIsProfileOpen(false)
      setProfileTab('loyalty')
    } catch (error) {
      setCodeStatus('error')
      const msg = error instanceof Error ? error.message : ''
      if (/invalid or expired code/i.test(msg) || msg === 'Неверный код') {
        setAuthErrorMessage(null)
      } else {
        setAuthErrorMessage(msg || 'Не удалось проверить код. Попробуйте ещё раз.')
      }
    } finally {
      setIsAuthLoading(false)
    }
  }

  useEffect(() => {
    void restoreSession()
  }, [])

  useEffect(() => {
    let ignore = false
    const loadAllProducts = async () => {
      try {
        const products = await getProducts()
        if (!ignore) setAllProducts(products)
      } catch {
        if (!ignore) setAllProducts([])
      }
    }
    void loadAllProducts()
    return () => {
      ignore = true
    }
  }, [activeView, isCatalogOpen])

  useEffect(() => {
    if (!isAdmin || profileTab !== 'admin' || adminTab !== 'products') return
    let ignore = false
    void getCategories()
      .then((list) => {
        if (!ignore) setAdminCategories(list)
      })
      .catch(() => {
        if (!ignore) setAdminCategories([])
      })
    return () => {
      ignore = true
    }
  }, [isAdmin, profileTab, adminTab])

  useEffect(() => {
    let ignore = false
    const loadSearch = async () => {
      const isSearchPanelOpen = activeHeaderPanel === 'search-success' || activeHeaderPanel === 'search-empty'
      if (!isSearchPanelOpen) return

      const q = searchQuery.trim()
      if (!q) {
        if (!ignore) {
          setSearchLoading(false)
          setSearchResults([])
          setActiveHeaderPanel('search-empty')
        }
        return
      }

      try {
        setSearchLoading(true)
        const products = await searchProducts(q)
        if (ignore) return
        const mapped = products.map(mapProductToSearchItem)
        setSearchResults(mapped)
        setActiveHeaderPanel(mapped.length ? 'search-success' : 'search-empty')
      } catch {
        if (!ignore) {
          setSearchResults([])
          setActiveHeaderPanel('search-empty')
        }
      } finally {
        if (!ignore) setSearchLoading(false)
      }
    }

    const timeout = window.setTimeout(() => {
      void loadSearch()
    }, 300)

    return () => {
      ignore = true
      window.clearTimeout(timeout)
    }
  }, [searchQuery, activeHeaderPanel])

  useEffect(() => {
    let ignore = false
    const loadCart = async () => {
      if (!isAuthenticated) {
        setCartItems([])
        return
      }
      try {
        setCartLoading(true)
        const items = await getCart()
        if (!ignore) {
          setCartItems(items)
          setProductQtyById(
            items.reduce<Record<string, number>>((acc, item) => {
              acc[`product-${item.productId}`] = item.quantity
              return acc
            }, {}),
          )
        }
      } catch {
        if (!ignore) setCartItems([])
      } finally {
        if (!ignore) setCartLoading(false)
      }
    }
    void loadCart()
    return () => {
      ignore = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    let ignore = false
    const loadFavorites = async () => {
      if (!isAuthenticated) {
        setFavoriteProducts([])
        return
      }
      try {
        setFavoritesLoading(true)
        const rows = await getFavorites()
        if (!ignore) {
          setFavoriteProducts(rows.map((row) => row.product))
        }
      } catch {
        if (!ignore) setFavoriteProducts([])
      } finally {
        if (!ignore) setFavoritesLoading(false)
      }
    }
    void loadFavorites()
    return () => {
      ignore = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    let ignore = false
    const loadOrders = async () => {
      if (!isAuthenticated) {
        setOrders([])
        setOrdersReady(true)
        setOrdersLoading(false)
        return
      }
      setOrdersReady(false)
      try {
        setOrdersLoading(true)
        const list = await getMyOrders()
        if (!ignore) setOrders(list)
      } catch {
        if (!ignore) setOrders([])
      } finally {
        if (!ignore) {
          setOrdersLoading(false)
          setOrdersReady(true)
        }
      }
    }
    void loadOrders()
    return () => {
      ignore = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !isProfileOpen || profileTab !== 'admin') return
    void Promise.all([adminLoadProducts(), adminLoadOrders(), adminLoadUsers()])
  }, [isAuthenticated, isAdmin, isProfileOpen, profileTab])

  useEffect(() => {
    if (!isAuthModalOpen || authMode !== 'code') return
    const t = window.setTimeout(() => authCodeInputRefs.current[0]?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [isAuthModalOpen, authMode])

  useEffect(() => {
    setProfileName(authUser?.firstName?.trim() || registrationName.trim())
    setProfileSurname(authUser?.lastName?.trim() || '')
  }, [authUser?.firstName, authUser?.lastName, registrationName])

  const saveProfileDetails = async () => {
    if (!isAuthenticated || profileDetailsSaveLoading) return
    setProfileDetailsSaveLoading(true)
    setProfileDetailsSaveFeedback(null)
    try {
      await patchMe({
        firstName: profileName.trim() || null,
        lastName: profileSurname.trim() || null,
      })
      await restoreSession()
      setProfileDetailsSaveFeedback('Сохранено')
      window.setTimeout(() => setProfileDetailsSaveFeedback(null), 2500)
    } catch (err) {
      setProfileDetailsSaveFeedback(
        err instanceof Error ? err.message : 'Не удалось сохранить профиль',
      )
    } finally {
      setProfileDetailsSaveLoading(false)
    }
  }

  const openCheckoutPanel = () => {
    setCheckoutError(null)
    setCheckoutForm({
      firstName: authUser?.firstName?.trim() || profileName.trim() || '',
      lastName: authUser?.lastName?.trim() || profileSurname.trim() || '',
      phone: (authUser?.phone?.trim() || registrationPhone || '').trim(),
      email: (authUser?.email || loginEmail || '').trim(),
      city: '',
      street: '',
      apartment: '',
      entrance: '',
      intercom: '',
      floor: '',
      comment: '',
    })
    setActiveHeaderPanel('checkout')
  }

  const submitCheckoutOrder = async () => {
    const fn = checkoutForm.firstName.trim()
    const ln = checkoutForm.lastName.trim()
    const em = checkoutForm.email.trim()
    const ph = checkoutForm.phone.trim()
    const city = checkoutForm.city.trim()
    const street = checkoutForm.street.trim()
    if (!fn || !ln) {
      setCheckoutError('Укажите имя и фамилию')
      return
    }
    if (!ph) {
      setCheckoutError('Укажите телефон')
      return
    }
    if (!em || !em.includes('@')) {
      setCheckoutError('Укажите корректную почту')
      return
    }
    if (!city || !street) {
      setCheckoutError('Укажите город и улицу с домом')
      return
    }
    try {
      setCheckoutError(null)
      await createOrder({
        fullName: `${fn} ${ln}`.trim(),
        email: em,
        phone: ph,
        city,
        addressLine: street,
        comment: checkoutForm.comment.trim() || null,
        apartment: checkoutForm.apartment.trim() || null,
        entrance: checkoutForm.entrance.trim() || null,
        intercom: checkoutForm.intercom.trim() || null,
        floor: checkoutForm.floor.trim() || null,
      })
      const orderedSnapshot = cartItems.map((row) => row.productId)
      const [items, list] = await Promise.all([getCart(), getMyOrders()])
      setCartItems(items)
      setOrders(list)
      setProductQtyById((prev) => {
        const next = { ...prev }
        for (const productId of orderedSnapshot) {
          delete next[`product-${productId}`]
        }
        return next
      })
      setCheckoutForm(CHECKOUT_FORM_EMPTY)
      setActiveHeaderPanel('order-success')
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Не удалось оформить заказ')
    }
  }

  return (
    <div
      className={`home-page${isCatalogOpen ? ' menu-open' : ''}${isAuthModalOpen ? ' auth-modal-open' : ''}`}
    >
      <img
        src={isProfileOpen ? '/morningdramma.jpg' : '/maindramma.jpg'}
        alt="Фоновое изображение"
        className="home-background"
      />

      {isAuthModalOpen ? (
        <>
          <div className="auth-overlay" aria-hidden="true" />

          <section
            className={`auth-modal${authMode === 'register' ? ' is-register' : ''}${authMode === 'code' ? ' is-code' : ''}`}
            aria-label="Окно входа и регистрации"
          >
            <button
              type="button"
              className="auth-close"
              aria-label="Закрыть"
              onClick={() => setIsAuthModalOpen(false)}
            />

            {authMode === 'login' ? (
              <>
                <p className="auth-title">Войти или зарегистрироваться</p>

                <label className="auth-input-wrap auth-input-wrap-login">
                  <input
                    type="email"
                    className={`auth-input${loginEmailError ? ' is-error' : ''}`}
                    placeholder="Электронная почта"
                    aria-label="Электронная почта"
                    value={loginEmail}
                    onChange={(event) => {
                      setLoginEmail(event.target.value)
                      if (loginEmailError) {
                        setLoginEmailError(false)
                      }
                    }}
                  />
                </label>

                {loginEmailError ? (
                  <p className="auth-input-error" role="alert">
                    Электронная почта введена некорректно
                  </p>
                ) : null}

                <button
                  type="button"
                  className="auth-submit"
                  onClick={async () => {
                    const valid = isEmailValid(loginEmail)
                    setLoginEmailError(!valid)
                    if (valid) {
                      try {
                        setIsAuthLoading(true)
                        setAuthErrorMessage(null)
                        await sendLoginCode(loginEmail, 'login')
                        setAuthReturnMode('login')
                        setAuthCodeResendRemainingSec(60)
                        setAuthMode('code')
                        setCodeDigits(['', '', '', ''])
                        setCodeStatus('idle')
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : ''
                        if (msg.includes('не найден') || msg.includes('No account')) {
                          setLoginEmailError(true)
                        } else {
                          setAuthErrorMessage(msg || 'Не удалось отправить письмо с кодом.')
                        }
                      } finally {
                        setIsAuthLoading(false)
                      }
                    }
                  }}
                >
                  {isAuthLoading ? 'Отправка...' : 'Далее'}
                </button>
                <button
                  type="button"
                  className="auth-inline-link auth-register-prompt"
                  onClick={() => {
                    setAuthMode('register')
                    setLoginEmailError(false)
                    setAuthErrorMessage(null)
                    clearRegisterFieldErrors()
                  }}
                >
                  Нет аккаунта? Зарегистрируйтесь
                </button>
                {authErrorMessage ? <p className="auth-dev-error">{authErrorMessage}</p> : null}
              </>
            ) : authMode === 'register' ? (
              <>
                <p className="auth-title auth-title-register">Зарегистрируйтесь</p>

                <label className="auth-field auth-field-email">
                  <input
                    type="email"
                    className={`auth-input${loginEmailError ? ' is-error' : ''}`}
                    placeholder="Электронная почта *"
                    aria-label="Электронная почта"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(event) => {
                      setLoginEmail(event.target.value)
                      if (loginEmailError) {
                        setLoginEmailError(false)
                      }
                    }}
                  />
                </label>

                {loginEmailError ? (
                  <p className="auth-input-error auth-input-error-register-email" role="alert">
                    Электронная почта введена некорректно
                  </p>
                ) : null}

                <label className="auth-field auth-field-name">
                  <input
                    type="text"
                    className={`auth-input${registrationNameError ? ' is-error' : ''}`}
                    placeholder="Имя *"
                    aria-label="Имя"
                    autoComplete="given-name"
                    value={registrationName}
                    onChange={(event) => {
                      setRegistrationName(event.target.value)
                      if (registrationNameError && event.target.value.trim()) {
                        setRegistrationNameError(false)
                      }
                    }}
                  />
                </label>

                <label className="auth-field auth-field-gender">
                  <select
                    className={`auth-input auth-select${registrationGenderError ? ' is-error' : ''}`}
                    aria-label="Пол"
                    value={registrationGender}
                    onChange={(event) => {
                      const v = event.target.value as 'female' | 'male' | ''
                      setRegistrationGender(v)
                      if (registrationGenderError && (v === 'female' || v === 'male')) {
                        setRegistrationGenderError(false)
                      }
                    }}
                  >
                    <option value="">Пол *</option>
                    <option value="female">Женский</option>
                    <option value="male">Мужской</option>
                  </select>
                </label>

                <label className="auth-field auth-field-birthday">
                  <input
                    type="date"
                    className={`auth-input auth-input-date${registrationBirthdayError ? ' is-error' : ''}`}
                    aria-label="День рождения"
                    min="1900-01-01"
                    max={birthdayInputMax}
                    value={registrationBirthday}
                    onChange={(event) => {
                      setRegistrationBirthday(event.target.value)
                      if (registrationBirthdayError && event.target.value) {
                        setRegistrationBirthdayError(false)
                      }
                    }}
                  />
                </label>

                <label className="auth-field auth-field-phone">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`auth-input${registrationPhoneError ? ' is-error' : ''}`}
                    placeholder="+7 (999) 123-45-67"
                    aria-label="Номер телефона"
                    value={registrationPhone}
                    onChange={(event) => {
                      const national = parsePhoneNational10(event.target.value)
                      setRegistrationPhone(formatRuPhoneDisplay(national))
                      if (registrationPhoneError && national.length === 10) {
                        setRegistrationPhoneError(false)
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="auth-submit auth-submit-register"
                  disabled={isAuthLoading}
                  onClick={async () => {
                    const emailOk = isEmailValid(loginEmail)
                    const nameOk = registrationName.trim().length > 0
                    const genderOk = registrationGender === 'female' || registrationGender === 'male'
                    const birthOk = Boolean(registrationBirthday)
                    const phoneNational = parsePhoneNational10(registrationPhone)
                    const phoneOk = phoneNational.length === 10

                    setLoginEmailError(!emailOk)
                    setRegistrationNameError(!nameOk)
                    setRegistrationGenderError(!genderOk)
                    setRegistrationBirthdayError(!birthOk)
                    setRegistrationPhoneError(!phoneOk)

                    if (!emailOk || !nameOk || !genderOk || !birthOk || !phoneOk) return

                    try {
                      setIsAuthLoading(true)
                      setAuthErrorMessage(null)
                      await sendLoginCode(loginEmail, 'signup')
                      setAuthReturnMode('register')
                      setAuthCodeResendRemainingSec(60)
                      setAuthMode('code')
                      setCodeDigits(['', '', '', ''])
                      setCodeStatus('idle')
                    } catch {
                      setAuthErrorMessage('Не удалось отправить письмо с кодом.')
                    } finally {
                      setIsAuthLoading(false)
                    }
                  }}
                >
                  {isAuthLoading ? 'Отправка...' : 'Продолжить'}
                </button>
                <button
                  type="button"
                  className="auth-inline-link auth-login-prompt"
                  onClick={() => {
                    setAuthMode('login')
                    setLoginEmailError(false)
                    setAuthErrorMessage(null)
                    clearRegisterFieldErrors()
                  }}
                >
                  Уже есть аккаунт? Войти
                </button>
                {authErrorMessage ? (
                  <p className="auth-register-api-error" role="alert">
                    {authErrorMessage}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="auth-title auth-title-code">Подтвердите почту</p>
                <p className="auth-code-email">Отправили код на почту {loginEmail || 'pochta@mail.ru'}</p>

                <div
                  className="auth-code-grid"
                  aria-label="Поле ввода кода"
                  onPaste={(event) => {
                    event.preventDefault()
                    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                    if (!text) return
                    const next: [string, string, string, string] = ['', '', '', '']
                    for (let i = 0; i < text.length; i++) next[i] = text[i] ?? ''
                    setCodeDigits([...next])
                    setCodeStatus('idle')
                    setAuthErrorMessage(null)
                    const focusAt = Math.min(text.length, 3)
                    window.setTimeout(() => authCodeInputRefs.current[focusAt]?.focus(), 0)
                  }}
                >
                  {codeDigits.map((digit, idx) => (
                    <input
                      key={`code-${idx}`}
                      ref={(el) => {
                        authCodeInputRefs.current[idx] = el
                      }}
                      className={`auth-code-cell${codeStatus === 'error' ? ' is-error' : ''}${codeStatus === 'success' ? ' is-success' : ''}`}
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={digit}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '').slice(-1)
                        setCodeDigits((prev) => prev.map((item, i) => (i === idx ? value : item)))
                        if (codeStatus !== 'idle') {
                          setCodeStatus('idle')
                        }
                        if (value && idx < 3) {
                          window.setTimeout(() => authCodeInputRefs.current[idx + 1]?.focus(), 0)
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleConfirmAuthCode()
                          return
                        }
                        if (event.key === 'Backspace' && !digit && idx > 0) {
                          event.preventDefault()
                          setCodeDigits((prev) => {
                            const next = [...prev]
                            next[idx - 1] = ''
                            return next
                          })
                          window.setTimeout(() => authCodeInputRefs.current[idx - 1]?.focus(), 0)
                        }
                      }}
                      aria-label={`Цифра кода ${idx + 1}`}
                    />
                  ))}
                </div>

                {codeStatus === 'error' || authErrorMessage ? (
                  <p className="auth-code-error">{authErrorMessage ?? 'Неверный код'}</p>
                ) : null}

                <button
                  type="button"
                  className={`auth-submit auth-confirm-submit${codeDigits.join('').length === 4 && !isAuthLoading ? ' is-ready' : ''}${codeStatus === 'success' ? ' is-success' : ''}`}
                  disabled={isAuthLoading || codeDigits.join('').length !== 4}
                  onClick={() => void handleConfirmAuthCode()}
                >
                  {isAuthLoading ? 'Проверка...' : 'Подтвердить'}
                </button>
                {authCodeResendRemainingSec > 0 ? (
                  <p className="auth-code-timer" role="status" aria-live="polite">
                    Код отправлен, повторно через {formatAuthCodeCountdown(authCodeResendRemainingSec)}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="auth-code-resend"
                    disabled={isAuthLoading}
                    onClick={() => void handleResendAuthCode()}
                  >
                    {isAuthLoading ? 'Отправка...' : 'Отправить повторно'}
                  </button>
                )}
                <button
                  type="button"
                  className="auth-secondary-submit auth-secondary-code"
                  onClick={() => {
                    setAuthMode(authReturnMode)
                    setCodeDigits(['', '', '', ''])
                    setCodeStatus('idle')
                    setAuthErrorMessage(null)
                    setLoginEmailError(false)
                  }}
                >
                  Сменить почту
                </button>
              </>
            )}
          </section>
        </>
      ) : null}

      {isCatalogOpen && !isProfileOpen ? (
        <>
          <button
            type="button"
            className="catalog-overlay"
            aria-label="Закрыть каталог"
            onClick={() => setIsCatalogOpen(false)}
          />

          <aside
            className={`catalog-drawer${activeSubcategory ? ' catalog-drawer--expanded' : ''}`}
            aria-label="Каталог"
          >
            {(() => {
              const catalogGridPage = (
                <div
                  className="catalog-grid-page"
                  style={
                    { ['--catalog-data-rows' as string]: String(CATALOG_GRID_DATA_ROWS) } as CSSProperties
                  }
                >
                  <div className="catalog-header">
                    <button
                      type="button"
                      className="catalog-menu-button"
                      aria-label="Закрыть меню"
                      onClick={() => setIsCatalogOpen(false)}
                    >
                      <img src="/home-assets/menu.png" alt="" />
                    </button>
                    <span className="catalog-title">Каталог</span>
                  </div>

                  <nav className="catalog-nav-grid" aria-label="Разделы каталога">
                    <ul className="catalog-list catalog-list--grid">
                      {CATEGORIES.map((category, i) => (
                        <li key={category} className="catalog-item" style={{ gridRow: i + 2 }}>
                          <button
                            type="button"
                            className={`catalog-item-button${activeCategory === category ? ' is-active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                          >
                            <span>{category}</span>
                            <span className="catalog-arrow" aria-hidden="true">
                              ›
                            </span>
                          </button>
                        </li>
                      ))}
                      <li className="catalog-item" style={{ gridRow: CATEGORIES.length + 2 }}>
                        <button
                          type="button"
                          className="catalog-item-button"
                          onClick={() => {
                            setActiveCategory(null)
                            setCatalogFilter({ mode: 'all' })
                            setIsCatalogOpen(false)
                            setActiveHeaderPanel(null)
                            setActiveView('catalog-list')
                          }}
                        >
                          <span>Все товары</span>
                          <span className="catalog-arrow" aria-hidden="true">
                            ›
                          </span>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )

              return activeSubcategory ? (
                <div className="catalog-drawer-split">
                  <section className="catalog-main-panel">{catalogGridPage}</section>
                  <section
                    className="catalog-sub-column"
                    aria-label={`Подкатегории ${activeSubcategory.title}`}
                    style={{ minWidth: `${CATALOG_SUB_COLUMN_MIN_WIDTH_PX}px` }}
                  >
                    <div
                      className="catalog-grid-page catalog-grid-page--sub"
                      style={
                        {
                          ['--catalog-data-rows' as string]: String(CATALOG_GRID_DATA_ROWS),
                          paddingLeft: 20 + activeSubcategory.titleX,
                        } as CSSProperties
                      }
                    >
                      <div
                        className="catalog-sub-heading"
                        style={{ paddingTop: 20 + activeSubcategory.titleY }}
                      >
                        <p className="catalog-sub-title">{activeSubcategory.title}</p>
                      </div>
                      <ul className="catalog-sub-list catalog-list--grid">
                        {activeSubcategory.items.map((subcategory, idx) => (
                          <li
                            key={subcategory.label}
                            style={{
                              gridRow: idx + 2,
                              ['--item-x' as string]: `${SUBCATEGORY_ITEM_X_PX}px`,
                            }}
                          >
                            <button
                              type="button"
                              className={`catalog-sub-item${hoveredSubItem === subcategory.label ? ' is-hovered-row' : ''}`}
                              onMouseEnter={() => setHoveredSubItem(subcategory.label)}
                              onMouseLeave={() => setHoveredSubItem(null)}
                              onClick={() => {
                                setCatalogFilter({
                                  mode: 'subcategory',
                                  category: activeSubcategory.title,
                                  subcategory: subcategory.label,
                                })
                                setIsCatalogOpen(false)
                                setActiveHeaderPanel(null)
                                setActiveView('catalog-list')
                              }}
                            >
                              {subcategory.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              ) : (
                <section className="catalog-main-panel">
                  {catalogGridPage}
                </section>
              )
            })()}
          </aside>
        </>
      ) : null}

      {activeHeaderPanel && !isProfileOpen ? (
        <>
          <button
            type="button"
            className="store-backdrop"
            aria-label="Закрыть окно"
            onClick={closeStorePanel}
          />
          <section
            className={`store-figma-panel${activeHeaderPanel === 'cart-full' ? ' is-cart-full' : ''}${activeHeaderPanel === 'checkout' ? ' is-checkout' : ''}${activeHeaderPanel === 'search-success' ? ' is-search-success' : ''}${activeHeaderPanel === 'search-empty' ? ' is-search-empty' : ''}${activeHeaderPanel === 'product-card' ? ' is-product-card' : ''}`}
            aria-label="Окно избранного или корзины"
          >
            {activeHeaderPanel === 'product-card' ? (
              <button
                type="button"
                className="store-figma-close"
                aria-label="Закрыть карточку товара"
                onClick={closeProductCard}
              />
            ) : null}

            {activeHeaderPanel === 'favorites-empty' ? (
              <div className="store-empty-state">
                <p className="store-empty-title">В избранном нет товаров</p>
                <p className="store-empty-subtitle">Но мы верим, что вы найдёте</p>
              </div>
            ) : null}

            {activeHeaderPanel === 'cart-empty' ? (
              <div className="store-empty-state">
                <p className="store-empty-title is-cart">В корзине нет товаров</p>
                <p className="store-empty-subtitle">Но мы верим, что вы найдёте</p>
              </div>
            ) : null}

            {activeHeaderPanel === 'favorites-full' ? (
              <div className="fav-full-list">
                {favoritesLoading ? <p className="search-loading">Загрузка избранного...</p> : null}
                {favoriteItems.map((item) => (
                  <div key={item.id} className="fav-full-item">
                    <article
                      className="fav-card"
                      onClick={() => openProductCard(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openProductCard(item)
                        }
                      }}
                    >
                      <div className="fav-card-bg" />
                      <p className="fav-product-title">{item.title}</p>
                      <p className="fav-product-desc">{item.productName}</p>
                      <p className="fav-product-volume">{item.volume}</p>
                      <p className="fav-product-price">{item.price}</p>
                      <div
                        className="fav-product-image"
                        style={{ backgroundImage: `url("${productImageCssUrl(item.imageUrl)}")` }}
                      />
                    </article>
                    <button
                      type="button"
                      className="fav-like-button"
                      aria-label="Убрать из избранного"
                      onClick={async (event) => {
                        event.stopPropagation()
                        const pid = item.productId
                        if (!pid) return
                        try {
                          await removeFavorite(pid)
                          const rows = await getFavorites()
                          setFavoriteProducts(rows.map((row) => row.product))
                          if (rows.length === 0) {
                            setActiveHeaderPanel('favorites-empty')
                          }
                        } catch {
                          /* ignored */
                        }
                      }}
                    >
                      <img src="/home-assets/favorite.png" alt="" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {activeHeaderPanel === 'search-success' ? (
              <div className="search-success-list">
                {searchLoading ? (
                  <p className="search-loading search-loading--overlay" aria-live="polite">
                    Идет поиск...
                  </p>
                ) : null}
                {searchResults.map((item) => (
                  <article
                    key={item.id}
                    className={`search-success-card${item.cardClassName}`}
                    onClick={() => openProductCard(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openProductCard(item)
                      }
                    }}
                  >
                    <div className="search-success-card-bg" />
                    <div
                      className={`search-success-image${item.imageClassName}`}
                      style={{
                        backgroundImage: `url("${productImageCssUrl(item.imageUrl)}")`,
                      }}
                    />
                    <p className="search-success-title">{item.title}</p>
                    <p className="search-success-desc">{item.description}</p>
                    <p className="search-success-volume">{item.volume}</p>
                    <p className={`search-success-price${item.priceClassName}`}>{item.price}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activeHeaderPanel === 'product-card' && productCardDisplay ? (
              <div
                className={`product-figma-layout${
                  productCardDisplay.hasColorChoice ? ' product-figma-layout--with-colors' : ''
                }`}
              >
                <div className="product-figma-image-wrap">
                  <div
                    className={`product-figma-image${productCardDisplay.displayImageClassName}`}
                    style={{
                      backgroundImage: `url("${productImageCssUrl(productCardDisplay.displayImageUrl)}")`,
                    }}
                  />
                </div>

                <p className="product-figma-head">О продукте</p>
                <p className="product-figma-name">{productCardDisplay.item.productName}</p>

                {productCardDisplay.hasColorChoice ? (
                  <div
                    className="product-figma-colors"
                    role="radiogroup"
                    aria-label="Оттенок"
                  >
                    {productCardDisplay.colorVariants.map((variant) => {
                      const isSelected = productCardDisplay.selectedVariant?.id === variant.id
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`product-figma-color-swatch${isSelected ? ' is-selected' : ''}`}
                          style={{ backgroundColor: variant.hex }}
                          title={variant.label}
                          onClick={() => setProductCardVariantId(variant.id)}
                        />
                      )
                    })}
                  </div>
                ) : null}

                <div className="product-figma-buy">
                  <p className="product-figma-price">{productCardDisplay.displayPrice}</p>
                  {productQtyById[productCardDisplay.cartQtyKey] ? (
                    <>
                      <button type="button" className="product-figma-add-btn is-in-cart">
                        В корзине
                      </button>
                      <div className="product-figma-qty">
                        <button
                          type="button"
                          className="product-figma-qty-btn is-minus"
                          aria-label="Уменьшить количество"
                          onClick={() => {
                            if (!isAuthenticated) {
                              openLoginModal()
                              return
                            }
                            const { cartQtyKey, displayProductId } = productCardDisplay
                            setProductQtyById((prev) => {
                              const current = prev[cartQtyKey] ?? 1
                              const next = current - 1
                              if (next <= 0) {
                                if (displayProductId) {
                                  void removeCartItem(displayProductId)
                                    .then(() => getCart().then(setCartItems))
                                    .catch(() => null)
                                }
                                const updated = { ...prev }
                                delete updated[cartQtyKey]
                                return updated
                              }
                              if (displayProductId) {
                                void updateCartItem(displayProductId, next)
                                  .then(() => getCart().then(setCartItems))
                                  .catch(() => null)
                              }
                              return { ...prev, [cartQtyKey]: next }
                            })
                          }}
                        >
                          –
                        </button>
                        <p className="product-figma-qty-value">{productQtyById[productCardDisplay.cartQtyKey]} шт</p>
                        <button
                          type="button"
                          className="product-figma-qty-btn is-plus"
                          aria-label="Увеличить количество"
                          onClick={() => {
                            if (!isAuthenticated) {
                              openLoginModal()
                              return
                            }
                            const { cartQtyKey, displayStock, displayProductId } = productCardDisplay
                            const current = productQtyById[cartQtyKey] ?? 1
                            const maxQty = displayStock ?? Number.MAX_SAFE_INTEGER
                            if (current >= maxQty) return
                            const next = current + 1
                            setProductQtyById((prev) => ({
                              ...prev,
                              [cartQtyKey]: next,
                            }))
                            if (displayProductId) {
                              void updateCartItem(displayProductId, next)
                                .then(() => getCart().then(setCartItems))
                                .catch(() => null)
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="product-figma-add-btn"
                      onClick={async () => {
                        if (!isAuthenticated) {
                          openLoginModal()
                          return
                        }
                        if (!productCardDisplay.displayProductId) return
                        try {
                          await addToCart(productCardDisplay.displayProductId, 1)
                          const items = await getCart()
                          setCartItems(items)
                          setProductQtyById((prev) => ({
                            ...prev,
                            [productCardDisplay.cartQtyKey]: 1,
                          }))
                        } catch {
                          /* ignored */
                        }
                      }}
                    >
                      Добавить в корзину
                    </button>
                  )}
                  <button
                    type="button"
                    className={`product-figma-like-btn${
                      productCardDisplay.displayProductId &&
                      isProductFavorite(productCardDisplay.displayProductId)
                        ? ' is-in-favorites'
                        : ''
                    }`}
                    aria-label={
                      productCardDisplay.displayProductId &&
                      isProductFavorite(productCardDisplay.displayProductId)
                        ? 'Убрать из избранного'
                        : 'Добавить в избранное'
                    }
                    onClick={async (event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      if (!isAuthenticated) {
                        openLoginModal()
                        return
                      }
                      const pid = productCardDisplay.displayProductId
                      if (!pid) return
                      try {
                        if (isProductFavorite(pid)) {
                          await removeFavorite(pid)
                        } else {
                          await addFavorite(pid)
                        }
                        const rows = await getFavorites()
                        setFavoriteProducts(rows.map((row) => row.product))
                      } catch {
                        /* ignored */
                      }
                    }}
                  />
                </div>

                <section className="product-figma-details">
                  <button
                    type="button"
                    className={`product-figma-tab product-figma-tab-description${productTab === 'description' ? ' is-active' : ''}`}
                    onClick={() => setProductTab('description')}
                  >
                    {DEFAULT_PRODUCT_TAB_DESCRIPTION}
                  </button>
                  <button
                    type="button"
                    className={`product-figma-tab product-figma-tab-characteristics${productTab === 'characteristics' ? ' is-active' : ''}`}
                    onClick={() => setProductTab('characteristics')}
                  >
                    {DEFAULT_PRODUCT_TAB_CHARACTERISTICS}
                  </button>
                  <button
                    type="button"
                    className={`product-figma-tab product-figma-tab-composition${productTab === 'composition' ? ' is-active' : ''}`}
                    onClick={() => setProductTab('composition')}
                  >
                    {DEFAULT_PRODUCT_TAB_COMPOSITION}
                  </button>
                  <div
                    className="product-figma-text-viewport"
                    aria-live="polite"
                  >
                    <div
                      className="product-figma-text-track"
                      style={{
                        transform: `translateX(-${productTabSlideIndex(productTab) * PRODUCT_FIGMA_TEXT_SLIDE_PX}px)`,
                      }}
                    >
                      <div className="product-figma-text-slide">
                        <p className="product-figma-text">{productCardDisplay.item.detailsText}</p>
                      </div>
                      <div className="product-figma-text-slide">
                        <p className="product-figma-text is-characteristics">
                          {productCardDisplay.item.characteristicsText}
                        </p>
                      </div>
                      <div className="product-figma-text-slide">
                        <p className="product-figma-text is-composition">
                          {productCardDisplay.item.compositionText}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {activeHeaderPanel === 'search-empty' ? (
              <div className="search-empty-state">
                <p className="search-empty-title">По запросу</p>
                <p className="search-empty-query">{searchQuery || 'Поиск'}</p>
                <p className="search-empty-subtitle">ничего не найдено</p>
              </div>
            ) : null}

            {activeHeaderPanel === 'cart-full' ? (
              <>
                {!cartLoading && cartItems.length > 0 ? (
                  <>
                    <p className="cart-screen-title">Корзина</p>
                    <p className="cart-screen-count">{formatProductCountRu(cartItems.length)}</p>
                  </>
                ) : null}
                <p className="cart-full-title">Сумма заказа</p>
                {cartLoading ? (
                  <p className="cart-loading-msg">Загрузка корзины...</p>
                ) : (
                  <div className="cart-items-scroll">
                  {cartItems.map((item) => {
                    const volumeLine = formatCartVolumeMl(item.product)
                    const imgUrl = item.product.imageUrl || '/krem1.png'
                    return (
                    <article key={item.id} className="cart-item">
                      <div className="cart-item-bg" />
                      <p className="cart-item-category">
                        {item.product.subcategory || item.product.category?.name || 'Каталог'}
                      </p>
                      <p className="cart-item-name">{item.product.name}</p>
                      {volumeLine ? <p className="cart-item-volume">{volumeLine}</p> : null}
                      <p className="cart-item-price">{formatPrice(Number(item.product.price))}</p>
                      <div
                        className="cart-item-image"
                        style={{ backgroundImage: `url(${JSON.stringify(imgUrl)})` }}
                      />
                      <button
                        type="button"
                        className="cart-trash"
                        aria-label="Удалить"
                        onClick={async () => {
                          await removeCartItem(item.productId)
                          const items = await getCart()
                          setCartItems(items)
                          setProductQtyById((prev) => {
                            const updated = { ...prev }
                            delete updated[`product-${item.productId}`]
                            return updated
                          })
                        }}
                      >
                        <span />
                      </button>
                      <div className="cart-qty">
                        <button
                          type="button"
                          className="cart-qty-minus"
                          aria-label="Уменьшить количество"
                          onClick={async () => {
                            const next = item.quantity - 1
                            if (next <= 0) {
                              await removeCartItem(item.productId)
                            } else {
                              await updateCartItem(item.productId, next)
                            }
                            const items = await getCart()
                            setCartItems(items)
                          }}
                        />
                        <span className="cart-qty-value">{item.quantity} шт</span>
                        <button
                          type="button"
                          className="cart-qty-plus"
                          aria-label="Увеличить количество"
                          onClick={async () => {
                            await updateCartItem(item.productId, item.quantity + 1)
                            const items = await getCart()
                            setCartItems(items)
                          }}
                        />
                      </div>
                    </article>
                    )
                  })}
                  </div>
                )}
                <div className="cart-cost-block cart-cost-products">
                  <span>Стоимость продуктов</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="cart-cost-block cart-cost-discount">
                  <span>Скидка</span>
                  <span>0 ₽</span>
                </div>
                <div className="cart-cost-block cart-cost-total">
                  <span>Итого</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <button type="button" className="cart-checkout-btn" onClick={openCheckoutPanel}>
                  К оформлению
                </button>
              </>
            ) : null}

            {activeHeaderPanel === 'checkout' ? (
              <>
                <p className="checkout-title checkout-title-recipient">Получатель</p>
                <div className="checkout-field checkout-name">
                  <p className="checkout-field-label">Имя *</p>
                  <input
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.firstName}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    autoComplete="given-name"
                    aria-label="Имя получателя"
                  />
                </div>
                <div className="checkout-field checkout-surname">
                  <p className="checkout-field-label">Фамилия *</p>
                  <input
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.lastName}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    autoComplete="family-name"
                    aria-label="Фамилия получателя"
                  />
                </div>
                <div className="checkout-field checkout-phone">
                  <p className="checkout-field-label">Телефон *</p>
                  <input
                    type="tel"
                    className="checkout-field-input checkout-field-input-phone"
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    autoComplete="tel"
                    aria-label="Телефон"
                  />
                </div>
                <div className="checkout-field checkout-email">
                  <p className="checkout-field-label">Электронная почта *</p>
                  <input
                    type="email"
                    className="checkout-field-input checkout-field-input-email"
                    value={checkoutForm.email}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    autoComplete="email"
                    aria-label="Электронная почта"
                  />
                </div>

                <p className="checkout-title checkout-title-address">Адрес доставки</p>
                <div
                  className={`checkout-field checkout-city checkout-field--float${
                    checkoutForm.city.trim() ? ' has-value' : ''
                  }`}
                >
                  <label className="checkout-field-label checkout-field-label--float" htmlFor="checkout-city">
                    Город *
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.city}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                    autoComplete="address-level2"
                    aria-label="Город"
                  />
                </div>
                <div
                  className={`checkout-field checkout-street checkout-field--float${
                    checkoutForm.street.trim() ? ' has-value' : ''
                  }`}
                >
                  <label className="checkout-field-label checkout-field-label--float" htmlFor="checkout-street">
                    Улица и дом *
                  </label>
                  <input
                    id="checkout-street"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.street}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, street: event.target.value }))
                    }
                    autoComplete="street-address"
                    aria-label="Улица и дом"
                  />
                </div>
                <div
                  className={`checkout-field checkout-flat checkout-field--float${
                    checkoutForm.apartment.trim() ? ' has-value' : ''
                  }`}
                >
                  <label className="checkout-field-label checkout-field-label--float" htmlFor="checkout-flat">
                    кв./офис
                  </label>
                  <input
                    id="checkout-flat"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.apartment}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, apartment: event.target.value }))
                    }
                    autoComplete="off"
                    aria-label="Квартира или офис"
                  />
                </div>
                <div
                  className={`checkout-field checkout-entrance checkout-field--float${
                    checkoutForm.entrance.trim() ? ' has-value' : ''
                  }`}
                >
                  <label
                    className="checkout-field-label checkout-field-label--float"
                    htmlFor="checkout-entrance"
                  >
                    подъезд
                  </label>
                  <input
                    id="checkout-entrance"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.entrance}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, entrance: event.target.value }))
                    }
                    autoComplete="off"
                    aria-label="Подъезд"
                  />
                </div>
                <div
                  className={`checkout-field checkout-floor checkout-field--float${
                    checkoutForm.floor.trim() ? ' has-value' : ''
                  }`}
                >
                  <label className="checkout-field-label checkout-field-label--float" htmlFor="checkout-floor">
                    этаж
                  </label>
                  <input
                    id="checkout-floor"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.floor}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, floor: event.target.value }))
                    }
                    autoComplete="off"
                    aria-label="Этаж"
                  />
                </div>
                <div
                  className={`checkout-field checkout-intercom checkout-field--float${
                    checkoutForm.intercom.trim() ? ' has-value' : ''
                  }`}
                >
                  <label
                    className="checkout-field-label checkout-field-label--float"
                    htmlFor="checkout-intercom"
                  >
                    домофон
                  </label>
                  <input
                    id="checkout-intercom"
                    type="text"
                    className="checkout-field-input"
                    value={checkoutForm.intercom}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, intercom: event.target.value }))
                    }
                    autoComplete="off"
                    aria-label="Домофон"
                  />
                </div>
                <div className="checkout-field checkout-comment">
                  <p className="checkout-field-label">Комментарий</p>
                  <textarea
                    className="checkout-field-textarea"
                    value={checkoutForm.comment}
                    onChange={(event) =>
                      setCheckoutForm((prev) => ({ ...prev, comment: event.target.value }))
                    }
                    rows={3}
                    maxLength={16000}
                    autoComplete="off"
                    aria-label="Комментарий к заказу"
                  />
                </div>
                <button type="button" className="checkout-submit-btn" onClick={() => void submitCheckoutOrder()}>
                  Оформить
                </button>
                {checkoutError ? <p className="checkout-error-text">{checkoutError}</p> : null}
              </>
            ) : null}

            {activeHeaderPanel === 'order-success' ? (
              <div className="order-success-notice">
                <img src="/Verify.svg" alt="" className="order-success-check-icon" />
                <p className="order-success-text">В ближайшее время свяжемся с вами!</p>
                <button
                  type="button"
                  className="order-success-home-btn"
                  onClick={() => setActiveHeaderPanel(null)}
                >
                  На главную страницу
                </button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {activeView === 'catalog-list' && activeHeaderPanel !== 'product-card' && !isProfileOpen ? (
        <>
          <button
            type="button"
            className="store-backdrop"
            aria-label="Закрыть каталог товаров"
            onClick={() => setActiveView('home')}
          />
          <section
            className="store-figma-panel catalog-products-panel"
            aria-label="Товары по подкатегории"
          >
            <p className="catalog-products-title">
              {catalogFilter?.mode === 'all'
                ? 'Все товары'
                : `${catalogFilter?.category || ''} / ${catalogFilter?.subcategory || ''}`}
            </p>
            <div className="catalog-results-list">
              {filteredCatalogItems.map((item) => (
                <article
                  key={item.id}
                  className="search-success-card"
                  onClick={() => {
                    openProductCard(item)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openProductCard(item)
                    }
                  }}
                >
                  <div className="search-success-card-bg" />
                  <div
                    className={`search-success-image${item.imageClassName}`}
                    style={{
                      backgroundImage: `url("${productImageCssUrl(item.imageUrl)}")`,
                    }}
                  />
                  <p className="search-success-title">{item.title}</p>
                  <p className="search-success-desc">{item.description}</p>
                  <p className="search-success-volume">{item.volume}</p>
                  <p className={`search-success-price${item.priceClassName}`}>{item.price}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {!isProfileOpen ? (
        <header className="home-header">
          <button
            type="button"
            className="icon-button menu-trigger-button"
            aria-label="Открыть меню"
            onClick={() => {
              dismissAllStorePanelsForMenu()
              setIsCatalogOpen(true)
              setActiveCategory(null)
              setHoveredSubItem(null)
            }}
          >
            <img src="/home-assets/menu.png" alt="" />
          </button>

          <input
            type="text"
            className="search-pill search-pill-input"
            placeholder="Найди для себя всё"
            aria-label="Поиск товаров"
            value={searchQuery}
            onFocus={() => {
              setIsCatalogOpen(false)
              setActiveView('home')
              if (activeHeaderPanel === 'search-success' || activeHeaderPanel === 'search-empty') {
                return
              }
              setActiveHeaderPanel(searchQuery.trim() ? 'search-success' : 'search-empty')
            }}
            onChange={(event) => {
              const nextValue = event.target.value
              setSearchQuery(nextValue)
              if (activeHeaderPanel !== 'search-success' && activeHeaderPanel !== 'search-empty') {
                setActiveHeaderPanel('search-empty')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchQuery('')
                closeStorePanel()
              }
            }}
          />
          {isPanelLogoVisible ? (
            <button
              type="button"
              className="header-panel-logo-button"
              aria-label="На главную"
              onClick={() => {
                setSearchQuery('')
                closeStorePanel()
                setActiveView('home')
                setIsCatalogOpen(false)
              }}
            >
              <img src="/logotip2.png" alt="DRAMA SK!N" className="header-panel-logo" />
            </button>
          ) : null}

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Избранное"
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal()
                  return
                }
                setIsCatalogOpen(false)
                if (activeView === 'catalog-list') {
                  setActiveView('home')
                }
                if (activeHeaderPanel === 'search-success' || activeHeaderPanel === 'search-empty') {
                  setSearchQuery('')
                }
                const nextView = favoriteItems.length ? 'full' : 'empty'
                setActiveHeaderPanel(nextView === 'empty' ? 'favorites-empty' : 'favorites-full')
              }}
            >
              <img src="/home-assets/favorite.png" alt="" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Корзина"
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal()
                  return
                }
                setIsCatalogOpen(false)
                if (activeView === 'catalog-list') {
                  setActiveView('home')
                }
                if (activeHeaderPanel === 'search-success' || activeHeaderPanel === 'search-empty') {
                  setSearchQuery('')
                }
                const nextView = cartItems.length ? 'full' : 'empty'
                setActiveHeaderPanel(nextView === 'empty' ? 'cart-empty' : 'cart-full')
              }}
            >
              <img src="/home-assets/cart.png" alt="" />
            </button>
            <button
              type="button"
              className="login-button"
              onClick={() => {
                if (isAuthenticated) {
                  setIsCatalogOpen(false)
                  setActiveView('home')
                  setActiveCategory(null)
                  setHoveredSubItem(null)
                  setActiveHeaderPanel(null)
                  setIsProfileOpen(true)
                  setProfileTab('loyalty')
                  return
                }
                openLoginModal()
              }}
            >
              {isAuthenticated ? 'Профиль' : 'Войти'}
            </button>
          </div>
        </header>
      ) : null}

      {isProfileOpen ? (
        <main className="profile-screen">
          <button
            type="button"
            className="profile-logo profile-logo-button"
            aria-label="На главную"
            onClick={goToMainFromProfile}
          >
            <img src="/logoprofile.png" alt="DRAMA SK!N" className="profile-logo-image" />
          </button>

          {!isAdmin ? (
            <section className="profile-name-card">
              <span>{profileDisplayName || 'Имя пользователя'}</span>
            </section>
          ) : null}

          {profileTab === 'loyalty' ? (
            <section className="profile-loyalty-card">
              <div className="profile-discount-head">
                <span>{loyaltyDiscountPercent}%</span>
                <div className="profile-buyout">
                  <span>{formatPrice(Math.round(loyaltyBuyoutTotalRub))}</span>
                </div>
              </div>

              <div className="profile-progress">
                <div className="profile-progress-fill" aria-hidden />
                <div className="profile-progress-step step-1" />
                <div className="profile-progress-step step-2" />
                <div className="profile-progress-step step-3" />
                <div className="profile-progress-step step-4" />
              </div>

              <div className="profile-progress-labels">
                {LOYALTY_MILESTONE_ROWS.map(({ percent, rub }) => (
                  <span
                    key={`pct-${rub}`}
                    className={loyaltyBuyoutTotalRub >= rub ? 'is-loyalty-milestone-passed' : undefined}
                  >
                    {percent} %
                  </span>
                ))}
              </div>
              <div className="profile-progress-labels is-bottom">
                {LOYALTY_MILESTONE_ROWS.map(({ rub }) => (
                  <span
                    key={`rub-${rub}`}
                    className={loyaltyBuyoutTotalRub >= rub ? 'is-loyalty-milestone-passed' : undefined}
                  >
                    {rub.toLocaleString('ru-RU')} ₽
                  </span>
                ))}
              </div>

              <p className="profile-loyalty-text">
                Уровень вашей скидки обновляется автоматически - мы всё делаем за вас.
                <br />
                Просто продолжайте выбирать любимое.
              </p>
            </section>
          ) : null}

          {profileTab === 'details' ? (
            <section className="profile-details-card">
              <div className="profile-details-field details-name">
                <p className="details-label details-label-small">Имя</p>
                <input
                  type="text"
                  className="details-input"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  aria-label="Имя пользователя"
                />
              </div>

              <div className="profile-details-field details-surname">
                <input
                  type="text"
                  className="details-input details-input-surname"
                  value={profileSurname}
                  onChange={(event) => setProfileSurname(event.target.value)}
                  aria-label="Фамилия"
                  placeholder="Фамилия"
                />
              </div>

              <div className="profile-details-field details-email is-emphasized">
                <p className="details-label details-label-small">Почта</p>
                <p className="details-value details-value-regular">{profileEmail}</p>
              </div>

              <div className="profile-details-field details-phone is-emphasized">
                <p className="details-label details-label-small">Телефон</p>
                <p className="details-value">{profilePhone}</p>
              </div>

              <div className="profile-details-field details-birthday is-emphasized">
                <p className="details-label details-label-small">Дата рождения</p>
                <p className="details-value">{profileBirthday}</p>
              </div>

              <button
                type="button"
                className="profile-details-save"
                disabled={profileDetailsSaveLoading}
                onClick={() => void saveProfileDetails()}
              >
                {profileDetailsSaveLoading ? 'Сохранение…' : 'Сохранить'}
              </button>
              {profileDetailsSaveFeedback ? (
                <p className="profile-details-save-feedback" role="status">
                  {profileDetailsSaveFeedback}
                </p>
              ) : null}
            </section>
          ) : null}

          {profileTab === 'orders' ? (
            <>
              {!ordersReady || ordersLoading ? (
                <section className="profile-orders-card" aria-busy="true">
                  <p className="profile-orders-empty profile-orders-empty--in-card">Загрузка заказов...</p>
                </section>
              ) : !hasAnyOrders ? (
                <div className="profile-orders-empty-state is-standalone">
                  <p className="profile-orders-empty-title">Покупок пока нет</p>
                  <p className="profile-orders-empty-subtitle">
                    Идеальный повод для первого шоппинга. Зайдите в каталог, наполните корзину и создайте свою
                    историю.
                  </p>
                  <button
                    type="button"
                    className="profile-orders-empty-btn"
                    onClick={() => {
                      setIsProfileOpen(false)
                      setProfileTab('loyalty')
                      setActiveHeaderPanel(null)
                      setActiveView('home')
                      setActiveCategory(null)
                      setHoveredSubItem(null)
                      setIsCatalogOpen(true)
                    }}
                  >
                    В каталог
                  </button>
                </div>
              ) : (
                <>
                  <div className="profile-orders-switch" role="tablist" aria-label="Тип заказов">
                    <button
                      type="button"
                      role="tab"
                      id="profile-orders-tab-active"
                      aria-selected={ordersView === 'active'}
                      aria-controls="profile-orders-panel-active"
                      className={`profile-orders-switch-btn${ordersView === 'active' ? ' is-active' : ''}`}
                      onClick={() => setOrdersView('active')}
                    >
                      Актуальные
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="profile-orders-tab-completed"
                      aria-selected={ordersView === 'completed'}
                      aria-controls="profile-orders-panel-completed"
                      className={`profile-orders-switch-btn${ordersView === 'completed' ? ' is-active' : ''}`}
                      onClick={() => setOrdersView('completed')}
                    >
                      Завершённые
                    </button>
                  </div>
                  <section className="profile-orders-card">
                  {ordersView === 'active' ? (
                    <div
                      key="orders-active"
                      className="profile-orders-panel profile-orders-panel--visible"
                      role="tabpanel"
                      id="profile-orders-panel-active"
                      aria-labelledby="profile-orders-tab-active"
                    >
                      {!activeOrders.length ? (
                        <p className="profile-orders-empty">Пока нет оформленных заказов.</p>
                      ) : (
                        activeOrders.map((order) => (
                          <div key={order.id} className="profile-order-block is-active-layout">
                            <div className="profile-order-head">
                              <p className="profile-order-title">{`Заказ от ${formatOrderDate(order.createdAt)}`}</p>
                              <div className="profile-order-status">{mapOrderStatus(order.status)}</div>
                            </div>
                            <div className="profile-order-items is-active-grid">
                              {order.items.slice(0, 4).map((item) => (
                                <div key={item.id} className="profile-order-item">
                                  <div
                                    className="profile-order-item-image"
                                    style={{
                                      backgroundImage: `url("${productImageCssUrl(item.product.imageUrl)}")`,
                                    }}
                                  />
                                  <p className="profile-order-item-price">
                                    {formatPrice(Number(item.unitPrice) * item.quantity)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div
                      key="orders-completed"
                      className="profile-orders-panel profile-orders-panel--visible"
                      role="tabpanel"
                      id="profile-orders-panel-completed"
                      aria-labelledby="profile-orders-tab-completed"
                    >
                      {!completedOrders.length ? (
                        <p className="profile-orders-empty">Пока нет завершенных заказов.</p>
                      ) : (
                        completedOrders.map((order) => (
                          <div key={order.id} className="profile-order-block is-completed-layout">
                            <div className="profile-order-head">
                              <p className="profile-order-title">{`Заказ от ${formatOrderDate(order.createdAt)}`}</p>
                              <div className="profile-order-status is-completed">
                                {mapOrderStatus(order.status)}
                              </div>
                            </div>
                            <div className="profile-order-items is-compact">
                              {order.items.map((item) => (
                                <div key={item.id} className="profile-order-item">
                                  <div
                                    className="profile-order-item-image"
                                    style={{
                                      backgroundImage: `url("${productImageCssUrl(item.product.imageUrl)}")`,
                                    }}
                                  />
                                  <p className="profile-order-item-price">
                                    {formatPrice(Number(item.unitPrice) * item.quantity)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  </section>
                </>
              )}
            </>
          ) : null}

          {profileTab === 'support' ? (
            <section className="profile-support-card">
              <p className="profile-support-free-title">Единый бесплатный номер</p>
              <p className="profile-support-phone">+7 (999) 000 00 00</p>
              <p className="profile-support-note-top">В дни праздников линия не работает</p>
              <p className="profile-support-mail-title">Электронная почта</p>
              <p className="profile-support-email">DramaSkin@mail.ru</p>
              <p className="profile-support-note-bottom">Все вопросы относительно ваших заказов</p>
            </section>
          ) : null}

          {profileTab === 'logout' ? (
            <section className="profile-logout-card" aria-labelledby="profile-logout-heading">
              <h2 id="profile-logout-heading" className="profile-logout-title">
                Вы уверены, что хотите выйти из аккаунта?
              </h2>
              <p className="profile-logout-note">
                После выхода для заказов, избранного и корзины снова потребуется вход по почте.
              </p>
              <button
                type="button"
                className="profile-logout-yes-btn"
                onClick={() => void performLogoutAndCloseProfile()}
              >
                Да
              </button>
            </section>
          ) : null}

          {profileTab === 'admin' && isAdmin ? (
            <section className="profile-admin-card">
              <div className="admin-head">
                <h2 className="admin-title">Админ-панель</h2>
              </div>

              <div className="admin-tabs">
                <button
                  type="button"
                  className={`admin-tab-btn${adminTab === 'products' ? ' is-active' : ''}`}
                  onClick={() => setAdminTab('products')}
                >
                  Товары
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn${adminTab === 'orders' ? ' is-active' : ''}`}
                  onClick={() => setAdminTab('orders')}
                >
                  Заказы
                </button>
                <button
                  type="button"
                  className={`admin-tab-btn${adminTab === 'users' ? ' is-active' : ''}`}
                  onClick={() => setAdminTab('users')}
                >
                  Пользователи
                </button>
              </div>

              {adminError ? <p className="admin-error">{adminError}</p> : null}

              {adminTab === 'products' ? (
                <section className="admin-products-section">
                  <form
                    className="admin-product-form"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      const catId = adminProductForm.categoryId
                      if (!catId || catId < 1) {
                        setAdminError('Выберите раздел каталога в списке выше.')
                        return
                      }
                      try {
                        setAdminActionLoading(true)
                        setAdminError(null)
                        let colorVariants: CatalogProductColorVariant[] | null | undefined
                        try {
                          if (!adminProductColorVariantsJson.trim()) {
                            colorVariants = editingProductId ? null : undefined
                          } else {
                            colorVariants = parseAdminColorVariantsField(adminProductColorVariantsJson)
                          }
                        } catch (parseErr) {
                          setAdminError(
                            parseErr instanceof Error
                              ? parseErr.message
                              : 'Оттенки: проверь JSON (массив объектов с id и hex)',
                          )
                          return
                        }
                        const payload: AdminProductPayload = {
                          ...adminProductForm,
                          categoryId: catId,
                          name: String(adminProductForm.name || '').trim(),
                          slug: String(adminProductForm.slug || '').trim(),
                          subcategory: String(adminProductForm.subcategory || '').trim(),
                          manufacturer: String(adminProductForm.manufacturer || '').trim(),
                          imageUrl: String(adminProductForm.imageUrl || '').trim(),
                          country: String(adminProductForm.country || '').trim(),
                          barcode: String(adminProductForm.barcode || '').trim(),
                          activeComponents: String(adminProductForm.activeComponents || '').trim(),
                          description: String(adminProductForm.description || ''),
                          usage: String(adminProductForm.usage || ''),
                          characteristics: String(adminProductForm.characteristics || ''),
                          composition: String(adminProductForm.composition || ''),
                          tabLabelDescription: null,
                          tabLabelCharacteristics: null,
                          tabLabelComposition: null,
                          colorVariants,
                        }
                        if (editingProductId) {
                          await adminUpdateProduct(editingProductId, payload)
                        } else {
                          await adminCreateProduct(payload)
                        }
                        await Promise.all([adminLoadProducts(), getProducts().then(setAllProducts)])
                        adminResetForm()
                      } catch (error) {
                        setAdminError(error instanceof Error ? error.message : 'Не удалось сохранить товар')
                      } finally {
                        setAdminActionLoading(false)
                      }
                    }}
                  >
                    <p className="admin-form-title">{editingProductId ? 'Редактирование товара' : 'Новый товар'}</p>
                    <label className="admin-field-label" htmlFor="admin-product-name">
                      Название
                    </label>
                    <input
                      id="admin-product-name"
                      className="admin-input"
                      placeholder="Например: Шампунь восстанавливающий"
                      value={String(adminProductForm.name || '')}
                      onChange={(event) => setAdminProductForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                    <label className="admin-field-label" htmlFor="admin-product-category">
                      Раздел каталога
                    </label>
                    <p className="admin-help">
                      Выбери один из разделов магазина (в базе сейчас{' '}
                      <strong>{adminCategories.length || '—'}</strong>
                      {adminCategories.length === 4 ? ' — как в макете: уход, макияж, волосы, тело' : ''}).
                      Другой вариант тут не появится — только то, что заведено в системе.
                    </p>
                    <select
                      id="admin-product-category"
                      className="admin-input admin-select"
                      value={adminProductForm.categoryId ? String(adminProductForm.categoryId) : ''}
                      onChange={(event) =>
                        setAdminProductForm((prev) => ({
                          ...prev,
                          categoryId: event.target.value ? Number(event.target.value) : undefined,
                        }))
                      }
                    >
                      <option value="">— нажми и выбери раздел —</option>
                      {adminCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {adminCategories.length === 0 ? (
                      <p className="admin-muted admin-field-hint">
                        Список разделов не загрузился — проверь сайт/API или обнови страницу.
                      </p>
                    ) : null}
                    <label className="admin-field-label" htmlFor="admin-product-slug">
                      Slug
                    </label>
                    <p className="admin-help">
                      Короткое <strong>техническое</strong> имя для ссылки: <strong>только латиница</strong>, цифры и
                      дефис, <strong>без пробелов и по-русски не писать</strong>. Одно и то же слово у двух товаров
                      нельзя — придумай уникальное, например{' '}
                      <code className="admin-code">shampun-lador-keratin</code>.
                    </p>
                    <input
                      id="admin-product-slug"
                      className="admin-input"
                      placeholder="latinica-cherez-defis-naprimer-krem-arencia"
                      value={String(adminProductForm.slug || '')}
                      onChange={(event) => setAdminProductForm((prev) => ({ ...prev, slug: event.target.value }))}
                    />
                    <p className="admin-field-label">Фото</p>
                    <div className="admin-image-block">
                      <input
                        ref={adminPhotoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="admin-file-input"
                        aria-label="Загрузить фото товара"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          if (!file) return
                          try {
                            setAdminPhotoUploading(true)
                            setAdminError(null)
                            const { url } = await adminUploadProductImage(file)
                            setAdminProductForm((prev) => ({ ...prev, imageUrl: url }))
                          } catch (error) {
                            setAdminError(error instanceof Error ? error.message : 'Не удалось загрузить фото')
                          } finally {
                            setAdminPhotoUploading(false)
                          }
                        }}
                      />
                      <div className="admin-image-actions">
                        <button
                          type="button"
                          className="admin-btn is-secondary"
                          disabled={adminPhotoUploading || adminActionLoading}
                          onClick={() => adminPhotoInputRef.current?.click()}
                        >
                          {adminPhotoUploading ? 'Загрузка…' : 'Выбрать фото с устройства'}
                        </button>
                      </div>
                      <label className="admin-field-label admin-field-label-inline" htmlFor="admin-product-image-url">
                        Путь или URL картинки
                      </label>
                      <input
                        id="admin-product-image-url"
                        className="admin-input"
                        placeholder="Или URL вручную: /krem1.png или /uploads/products/…"
                        value={String(adminProductForm.imageUrl || '')}
                        onChange={(event) =>
                          setAdminProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                        }
                      />
                      {adminProductForm.imageUrl ? (
                        <div
                          className="admin-image-preview"
                          style={{
                            backgroundImage: `url("${productImageCssUrl(adminProductForm.imageUrl)}")`,
                          }}
                          role="img"
                          aria-label="Предпросмотр"
                        />
                      ) : null}
                    </div>
                    <p className="admin-field-label admin-field-label-numeric-row">Цена и склад</p>
                    <div className="admin-form-row admin-form-row-2">
                      <div className="admin-numeric-cell">
                        <span className="admin-micro-label" aria-hidden="true">
                          цена в рублях
                        </span>
                        <label className="visually-hidden" htmlFor="admin-product-price">
                          Цена в рублях
                        </label>
                        <input
                          id="admin-product-price"
                          className="admin-input"
                          placeholder="0"
                          type="number"
                          min={0}
                          step={1}
                          value={Number(adminProductForm.price || 0)}
                          onChange={(event) =>
                            setAdminProductForm((prev) => ({ ...prev, price: Number(event.target.value) }))
                          }
                        />
                      </div>
                      <div className="admin-numeric-cell">
                        <span className="admin-micro-label" aria-hidden="true">
                          сколько штук на складе
                        </span>
                        <label className="visually-hidden" htmlFor="admin-product-stock">
                          Остаток в штуках
                        </label>
                        <input
                          id="admin-product-stock"
                          className="admin-input"
                          placeholder="0"
                          type="number"
                          min={0}
                          step={1}
                          value={Number(adminProductForm.stock || 0)}
                          onChange={(event) =>
                            setAdminProductForm((prev) => ({ ...prev, stock: Number(event.target.value) }))
                          }
                        />
                      </div>
                    </div>
                    <label className="admin-field-label" htmlFor="admin-product-subcategory">
                      Подкатегория (текст, например «Шампунь»)
                    </label>
                    <input
                      id="admin-product-subcategory"
                      className="admin-input"
                      placeholder="Шампунь, Очищение…"
                      value={String(adminProductForm.subcategory || '')}
                      onChange={(event) =>
                        setAdminProductForm((prev) => ({ ...prev, subcategory: event.target.value }))
                      }
                    />
                    <p className="admin-field-label">Тексты вкладок карточки товара на сайте</p>
                    <p className="admin-help">
                      Названия вкладок всегда: «{DEFAULT_PRODUCT_TAB_DESCRIPTION}», «
                      {DEFAULT_PRODUCT_TAB_CHARACTERISTICS}», «{DEFAULT_PRODUCT_TAB_COMPOSITION}». Ниже —
                      содержимое каждой вкладки.
                    </p>
                    <label className="admin-field-label" htmlFor="admin-product-desc">
                      {DEFAULT_PRODUCT_TAB_DESCRIPTION} (вкладка)
                    </label>
                    <textarea
                      id="admin-product-desc"
                      className="admin-textarea"
                      placeholder="Текст для вкладки «Описание»"
                      value={String(adminProductForm.description || '')}
                      onChange={(event) =>
                        setAdminProductForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                    <label className="admin-field-label" htmlFor="admin-product-characteristics">
                      {DEFAULT_PRODUCT_TAB_CHARACTERISTICS} (вкладка)
                    </label>
                    <textarea
                      id="admin-product-characteristics"
                      className="admin-textarea"
                      placeholder="Текст для вкладки «Характеристики» (можно построчно)"
                      value={String(adminProductForm.characteristics || '')}
                      onChange={(event) =>
                        setAdminProductForm((prev) => ({ ...prev, characteristics: event.target.value }))
                      }
                    />
                    <label className="admin-field-label" htmlFor="admin-product-composition">
                      {DEFAULT_PRODUCT_TAB_COMPOSITION} (вкладка)
                    </label>
                    <textarea
                      id="admin-product-composition"
                      className="admin-textarea"
                      placeholder="Текст для вкладки «Состав»"
                      value={String(adminProductForm.composition || '')}
                      onChange={(event) =>
                        setAdminProductForm((prev) => ({ ...prev, composition: event.target.value }))
                      }
                    />
                    <label className="admin-field-label" htmlFor="admin-product-color-variants">
                      Оттенки (JSON, опционально)
                    </label>
                    <p className="admin-help">
                      Массив <code className="admin-code">id</code>, <code className="admin-code">hex</code>, по желанию{' '}
                      <code className="admin-code">label</code> — на сайте только <strong>цветные круги</strong> по{' '}
                      <code className="admin-code">hex</code>; большое фото карточки всегда из поля «Путь или URL
                      картинки» выше. Опционально в JSON можно держать <code className="admin-code">swatchImageUrl</code> /{' '}
                      <code className="admin-code">imageUrl</code> для других сценариев, витрина их не подставляет в
                      макет. Два и больше оттенка — ряд кругов на карточке. Пустое поле: при создании не сохраняем; при
                      редактировании — сброс в БД. Явный сброс: строка <code className="admin-code">null</code>.
                    </p>
                    <textarea
                      id="admin-product-color-variants"
                      className="admin-textarea"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                      spellCheck={false}
                      placeholder='[\n  { "id": "shade-1", "hex": "#c00", "label": "Classic" }\n]'
                      value={adminProductColorVariantsJson}
                      onChange={(event) => setAdminProductColorVariantsJson(event.target.value)}
                      rows={8}
                    />
                    <div className="admin-form-actions">
                      <button type="submit" className="admin-btn" disabled={adminActionLoading}>
                        {editingProductId ? 'Сохранить' : 'Добавить товар'}
                      </button>
                      <button type="button" className="admin-btn is-secondary" onClick={adminResetForm}>
                        Сброс
                      </button>
                    </div>
                  </form>

                  <div className="admin-products-list">
                    {adminProductsLoading ? <p className="admin-muted">Загрузка товаров...</p> : null}
                    {!adminProductsLoading &&
                      adminProducts.map((product) => (
                        <article key={product.id} className="admin-product-card">
                          <div
                            className="admin-product-image"
                            style={{ backgroundImage: `url("${productImageCssUrl(product.imageUrl)}")` }}
                          />
                          <div className="admin-product-main">
                            <p className="admin-product-name">{product.name}</p>
                            <p className="admin-product-meta">
                              {product.category.name} / {product.subcategory || '-'} /{' '}
                              {formatPrice(Number(product.price))}
                            </p>
                            <p className="admin-product-meta">Остаток: {product.stock}</p>
                          </div>
                          <div className="admin-product-actions">
                            <button
                              type="button"
                              className="admin-btn is-secondary"
                              onClick={() => adminStartEditProduct(product)}
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              className="admin-btn is-secondary"
                              onClick={async () => {
                                if (!window.confirm(product.isPublished ? 'Скрыть товар?' : 'Показать товар?')) return
                                try {
                                  setAdminActionLoading(true)
                                  await adminSetProductPublish(product.id, !product.isPublished)
                                  await Promise.all([adminLoadProducts(), getProducts().then(setAllProducts)])
                                } catch (error) {
                                  setAdminError(error instanceof Error ? error.message : 'Не удалось изменить видимость')
                                } finally {
                                  setAdminActionLoading(false)
                                }
                              }}
                            >
                              {product.isPublished ? 'Скрыть' : 'Показать'}
                            </button>
                            <button
                              type="button"
                              className="admin-btn is-danger"
                              onClick={async () => {
                                if (!window.confirm('Удалить товар?')) return
                                try {
                                  setAdminActionLoading(true)
                                  await adminDeleteProduct(product.id)
                                  await Promise.all([adminLoadProducts(), getProducts().then(setAllProducts)])
                                } catch (error) {
                                  setAdminError(error instanceof Error ? error.message : 'Не удалось удалить товар')
                                } finally {
                                  setAdminActionLoading(false)
                                }
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ) : null}

              {adminTab === 'orders' ? (
                <section className="admin-orders-section">
                  {adminOrdersLoading ? <p className="admin-muted">Загрузка заказов...</p> : null}
                  {!adminOrdersLoading &&
                    adminOrders.map((order) => (
                      <article key={order.id} className="admin-order-card">
                        <div className="admin-order-head">
                          <p className="admin-order-title">{`Заказ #${order.id} от ${formatOrderDate(order.createdAt)}`}</p>
                          <select
                            className="admin-select"
                            value={order.status}
                            onChange={async (event) => {
                              try {
                                await adminSetOrderStatus(order.id, event.target.value as ApiOrderStatus)
                                await adminLoadOrders()
                              } catch (error) {
                                setAdminError(error instanceof Error ? error.message : 'Не удалось сменить статус')
                              }
                            }}
                          >
                            {ADMIN_ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {orderStatusLabelRu(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="admin-order-meta">{formatOrderDeliverySummary(order)}</p>
                        <div className="admin-order-items">
                          {order.items.map((item) => (
                            <div key={item.id} className="admin-order-item">
                              <span>{item.product.name}</span>
                              <span>{`x${item.quantity}`}</span>
                              <span>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="admin-order-actions">
                          <button
                            type="button"
                            className="admin-btn is-secondary"
                            onClick={async () => {
                              try {
                                const txt = await adminDownloadOrderTxt(order.id)
                                const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `order-${order.id}.txt`
                                a.click()
                                URL.revokeObjectURL(url)
                              } catch (error) {
                                setAdminError(error instanceof Error ? error.message : 'Не удалось скачать txt')
                              }
                            }}
                          >
                            Скачать txt
                          </button>
                          <button
                            type="button"
                            className="admin-btn is-secondary"
                            onClick={async () => {
                              if (!window.confirm('Отменить заказ?')) return
                              try {
                                await adminCancelOrder(order.id)
                                await adminLoadOrders()
                              } catch (error) {
                                setAdminError(error instanceof Error ? error.message : 'Не удалось отменить заказ')
                              }
                            }}
                          >
                            Отменить
                          </button>
                          <button
                            type="button"
                            className="admin-btn is-danger"
                            onClick={async () => {
                              if (!window.confirm('Удалить заказ полностью?')) return
                              try {
                                await adminDeleteOrder(order.id)
                                await adminLoadOrders()
                              } catch (error) {
                                setAdminError(error instanceof Error ? error.message : 'Не удалось удалить заказ')
                              }
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      </article>
                    ))}
                </section>
              ) : null}

              {adminTab === 'users' ? (
                <section className="admin-users-section">
                  <form
                    className="admin-user-form"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      if (!editingUserId) {
                        setAdminError('Выберите пользователя из списка для редактирования')
                        return
                      }
                      try {
                        setAdminActionLoading(true)
                        setAdminError(null)
                        await adminUpdateUser(editingUserId, {
                          email: adminUserForm.email.trim(),
                          firstName: adminUserForm.firstName.trim() || null,
                          lastName: adminUserForm.lastName.trim() || null,
                          phone: adminUserForm.phone.trim() || null,
                          dateOfBirth: adminUserForm.dateOfBirth || null,
                          role: adminUserForm.role,
                        })
                        await adminLoadUsers()
                        if (authUser?.id === editingUserId) {
                          await restoreSession()
                        }
                        adminResetUserForm()
                      } catch (error) {
                        setAdminError(error instanceof Error ? error.message : 'Не удалось обновить пользователя')
                      } finally {
                        setAdminActionLoading(false)
                      }
                    }}
                  >
                    <p className="admin-form-title">
                      {editingUserId ? `Редактирование пользователя #${editingUserId}` : 'Редактирование пользователя'}
                    </p>
                    <input
                      className="admin-input"
                      placeholder="Email"
                      type="email"
                      value={adminUserForm.email}
                      onChange={(event) => setAdminUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                    <div className="admin-form-row is-two">
                      <input
                        className="admin-input"
                        placeholder="Имя"
                        value={adminUserForm.firstName}
                        onChange={(event) => setAdminUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      />
                      <input
                        className="admin-input"
                        placeholder="Фамилия"
                        value={adminUserForm.lastName}
                        onChange={(event) => setAdminUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      />
                    </div>
                    <div className="admin-form-row is-two">
                      <input
                        className="admin-input"
                        placeholder="Телефон"
                        value={adminUserForm.phone}
                        onChange={(event) => setAdminUserForm((prev) => ({ ...prev, phone: event.target.value }))}
                      />
                      <input
                        className="admin-input"
                        type="date"
                        value={adminUserForm.dateOfBirth}
                        onChange={(event) =>
                          setAdminUserForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                        }
                      />
                    </div>
                    <select
                      className="admin-select"
                      value={adminUserForm.role}
                      onChange={(event) =>
                        setAdminUserForm((prev) => ({ ...prev, role: event.target.value as 'USER' | 'ADMIN' }))
                      }
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <div className="admin-form-actions">
                      <button type="submit" className="admin-btn" disabled={adminActionLoading}>
                        Сохранить
                      </button>
                      <button type="button" className="admin-btn is-secondary" onClick={adminResetUserForm}>
                        Сброс
                      </button>
                    </div>
                  </form>

                  <div className="admin-users-list">
                    {adminUsersLoading ? <p className="admin-muted">Загрузка пользователей...</p> : null}
                    {!adminUsersLoading &&
                      adminUsers.map((user) => (
                        <article key={user.id} className="admin-user-card">
                          <div className="admin-user-main">
                            <p className="admin-product-name">{user.email}</p>
                            <p className="admin-product-meta">
                              {`${user.firstName || '-'} ${user.lastName || ''}`.trim()} •{' '}
                              {user.phone || 'Телефон не указан'}
                            </p>
                            <p className="admin-product-meta">
                              Дата рождения: {user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : 'Не указана'} • Роль:{' '}
                              {user.role}
                            </p>
                          </div>
                          <div className="admin-user-actions">
                            <button
                              type="button"
                              className="admin-btn is-secondary"
                              onClick={() => adminStartEditUser(user)}
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              className="admin-btn is-danger"
                              onClick={async () => {
                                if (!window.confirm(`Удалить пользователя ${user.email}?`)) return
                                try {
                                  await adminDeleteUser(user.id)
                                  await adminLoadUsers()
                                  if (editingUserId === user.id) adminResetUserForm()
                                } catch (error) {
                                  setAdminError(error instanceof Error ? error.message : 'Не удалось удалить пользователя')
                                }
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          <nav className="profile-tabs">
            <button
              type="button"
              className={`profile-tab profile-tab-loyalty${profileTab === 'loyalty' ? ' profile-tab-active' : ''}`}
              onClick={() => setProfileTab('loyalty')}
            >
              Программа лояльности
            </button>
            <button
              type="button"
              className={`profile-tab profile-tab-details${profileTab === 'details' ? ' profile-tab-active' : ''}`}
              onClick={() => setProfileTab('details')}
            >
              Личные данные
            </button>
            <button
              type="button"
              className={`profile-tab profile-tab-orders${profileTab === 'orders' ? ' profile-tab-active' : ''}`}
              onClick={() => {
                setProfileTab('orders')
                setOrdersView('active')
              }}
            >
              Заказы
            </button>
            <button
              type="button"
              className={`profile-tab profile-tab-support${profileTab === (isAdmin ? 'admin' : 'support') ? ' profile-tab-active' : ''}`}
              onClick={() => setProfileTab(isAdmin ? 'admin' : 'support')}
            >
              {isAdmin ? 'Админ' : 'Поддержка'}
            </button>
            <button
              type="button"
              className={`profile-tab profile-tab-logout${profileTab === 'logout' ? ' profile-tab-active' : ''}`}
              onClick={() => setProfileTab('logout')}
            >
              Выйти
            </button>
          </nav>
        </main>
      ) : !activeHeaderPanel && activeView === 'home' ? (
        <main className="hero-brand">
          <img src="/hero-logo.png" alt="DRAMA SK!N" className="hero-logo-image" />
        </main>
      ) : null}
    </div>
  )
}

export default App
