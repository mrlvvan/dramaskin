import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  const categories = [
    {
      name: "Основной уход",
      slug: "osnovnoy-uhod",
      description: "Очищение, тонизирование, увлажнение и базовый уход.",
    },
    {
      name: "Макияж",
      slug: "makiyazh",
      description: "Продукты для лица, глаз и губ.",
    },
    {
      name: "Волосы",
      slug: "volosy",
      description: "Шампуни, кондиционеры и уход для волос.",
    },
    {
      name: "Тело",
      slug: "telo",
      description: "Уход за телом и гигиена.",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: category,
    });
  }

  const careCategory = await prisma.category.findUnique({
    where: { slug: "osnovnoy-uhod" },
  });
  const makeupCategory = await prisma.category.findUnique({
    where: { slug: "makiyazh" },
  });
  const hairCategory = await prisma.category.findUnique({
    where: { slug: "volosy" },
  });
  const bodyCategory = await prisma.category.findUnique({
    where: { slug: "telo" },
  });

  const products = [
    {
      name: "Крем для лица Arencia Deep Water Surge Soothing Cream",
      slug: "arencia-deep-water-surge-soothing-cream",
      subcategory: "Увлажнение",
      description:
        "Успокаивающий крем с ПДРН и пептидами для интенсивного увлажнения. Помогает снять раздражение, поддерживает упругость кожи и укрепляет защитный барьер.",
      usage:
        "После очищения и тонизирования нанесите крем на лицо и распределите по коже.",
      manufacturer: "Arencia",
      activeComponents: "ПДРН, Пептиды, Церамиды, Гиалуроновая кислота",
      weightGr: 80,
      country: "Южная Корея",
      barcode: "8809999991001",
      characteristics:
        "Производитель: Arencia\nАктивные компоненты: ПДРН, Пептиды, Церамиды, Гиалуроновая кислота\nВес (гр): 80\nСтрана: Южная Корея\nШтрихкод: 8809999991001",
      composition:
        "Water, Glycerin, Niacinamide, Ceramide NP, Sodium DNA, Peptides, Centella Asiatica Extract.",
      price: "2750",
      stock: 16,
      imageUrl: "/tovar2.png",
      categoryId: careCategory?.id,
    },
    {
      name: "Крем для лица Dr. Althea 345 Relief Cream",
      slug: "dr-althea-345-relief-cream",
      subcategory: "Увлажнение",
      description:
        "Успокаивающий крем Dr. Althea Resveratrol 345 Relief Cream - увлажняющее средство для чувствительной кожи с легкой текстурой. Ускоряет процессы регенерации и обновления, укрепляет защитный барьер, нейтрализует негативное воздействие окружающих факторов и поддерживает оптимальный уровень увлажнения.\n\nУспокаивает раздраженную кожу, снимает зуд, уменьшает покраснение, выравнивает тон и возвращает коже сияние. Обладает легкой гелевой консистенцией, быстро впитывается.\n\nОдин из главных компонентов крема - ресвератрол - является мощным антиоксидантом и помогает бороться со свободными радикалами.\n\nДополнительные действующие компоненты: ПДРН (Sodium DNA), Ниацинамид (витамин B3), Пантенол (витамин B5), Экстракт листьев центеллы азиатской, Церамиды.",
      usage: "Нанесите необходимое количество крема легкими массажными движениями.",
      manufacturer: "Dr. Althea",
      activeComponents:
        "Ниацинамид (Витамин B3), Пантенол (Витамин B5), Ресвератрол, Центелла азиатская, ПДРН (PDRN)",
      weightGr: 50,
      country: "Южная Корея",
      barcode: "8809447251394",
      characteristics:
        "Производитель: Dr. Althea\nАктивные компоненты: Ниацинамид (Витамин B3), Пантенол (Витамин B5), Ресвератрол, Центелла азиатская, ПДРН (PDRN)\nОбъем (мл): 50\nТип кожи: для сухой кожи, для комбинированной кожи, для нормальной кожи\nСтрана: Южная Корея\nШтрихкод: 8809447251394",
      composition:
        "Water (Aqua), Melaleuca Alternifolia (Tea Tree) Leaf Water, Propanediol, Glycerin, 1,2-Hexanediol, Hydrogenated Polydecene, Vinyl Dimethicone, C14-22 Alcohols, Caprylic/Capric Triglyceride, Niacinamide, Panthenol, Dicaprylyl Carbonate, Butylene Glycol, Ammonium Acryloyldimethyltaurate/VP Copolymer, Caprylyl Methicone, Polymethylsilsesquioxane, C12-20 Alkyl Glucoside, Hydroxyacetophenone, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Polyquaternium-51, Ethylhexylglycerin, Tromethamine, Sodium Hyaluronate, Sodium Stearoyl Glutamate, Coptis Japonica Root Extract, Centella Asiatica Leaf Water, Beta-Glucan, Resveratrol, Hydrolyzed Hyaluronic Acid, Camellia Sinensis Leaf Water, Tocopherol, Madecassoside, Sodium DNA, Centella Asiatica Extract, Ceramide NP, Tannic Acid, Disodium EDTA, Sodium Phytate",
      price: "2950",
      stock: 8,
      imageUrl: "/relief-cream.png",
      categoryId: careCategory?.id,
    },
    {
      name: "Тональный кушон Drama Skin Tint Cushion Soft Glow",
      slug: "tint-cushion-soft-glow",
      subcategory: "Для лица",
      description:
        "Легкий тональный кушон со средней степенью покрытия и естественным сияющим финишем. Выравнивает тон и комфортно ощущается в течение дня.",
      usage: "Нанесите на лицо спонжем, распределяя средство тонким слоем.",
      manufacturer: "Drama Skin",
      activeComponents: "Увлажняющая эссенция, Пигменты",
      weightGr: 15,
      country: "Южная Корея",
      barcode: "8809999991003",
      characteristics:
        "Производитель: Drama Skin\nАктивные компоненты: Увлажняющая эссенция\nВес (гр): 15\nСтрана: Южная Корея\nШтрихкод: 8809999991003",
      composition: "Water, Titanium Dioxide, Glycerin, Pigments, Emollients.",
      price: "2490",
      stock: 12,
      imageUrl: "/unleashla.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Стойкий тональный кушон Unleashia Healthy Green Cushion SPF30 PA++",
      slug: "unleashia-healthy-green-cushion-spf30-pa-plus",
      subcategory: "Для лица",
      description:
        "Стойкий тональный кушон Unleashia Healthy Green Cushion SPF30 PA++ с сатиновым финишем обладает средней степенью покрытия, выравнивает тон, скрывает покраснение, поры и другие несовершенства кожи. Растительные экстракты и 76% увлажняющей эссенции в составе успокаивают раздраженную кожу и защищают от сухости.\n\nКомфортно ощущается на протяжении всего дня, не сушит и не скатывается. Физические фильтры защищают от ультрафиолетового излучения и появления пигментации.\n\nОсобый формат упаковки позволяет регулировать количество продукта и гигиенично его использовать. Спонж каплевидной формы позволяет равномерно распределить тон по всему лицу, включая труднодоступные зоны вокруг глаз, носа и губ.",
      usage:
        "Нажмите на боковую кнопку для извлечения продукта, нанесите его с помощью специального спонжа, равномерно распределите по всей поверхности лица для придания однородного оттенка.",
      manufacturer: "Unleashia",
      activeComponents:
        "Бакучиол, Ниацинамид (Витамин B3), Сквалан, Ромашка, Физические фильтры",
      weightGr: 15,
      country: "Южная Корея",
      barcode: "8809647770978",
      characteristics:
        "Производитель: Unleashia\nАктивные компоненты: Бакучиол, Ниацинамид (Витамин B3), Сквалан, Ромашка, Физические фильтры\nВес (гр): 15\nСтрана: Южная Корея\nШтрихкод: 8809647770978",
      composition:
        "Water, Titanium Dioxide, Diphenylsiloxy Phenyl Trimethicone, Butylene Glycol, Butyloctyl Salicylate, Ethylhexyl Stearate, C12-15 Alkyl Benzoate, Cyclopentasiloxane, Glycerin, Cetyl PEG/PPG-10/1 Dimethicone, Polyglyceryl-4 Isostearate, Pentaerythrityl Tetraisostearate, Niacinamide, Iron Oxides (CI 77492), Squalane, PVP, Cyclohexasiloxane, Dimer Dilinoleyl Dimer Dilinoleate, Disteardimonium Hectorite, Magnesium Sulfate, Trimethylsiloxysilicate, Polyphenylsilsesquioxane, Tribehenin, Acrylates/Stearyl Acrylate/Dimethicone Methacrylate Copolymer, Iron Oxides (CI 77491), Triethoxycaprylylsilane, Aluminum Hydroxide, Caprylyl Glycol, Iron Oxides (CI 77499), Bakuchiol, Ethylhexylglycerin, Adenosine, 1,2-Hexanediol, Carica Papaya (Papaya) Fruit Water, Chamomilla Recutita (Matricaria) Flower Extract, Polyglutamic Acid, Polymethylsilsesquioxane, Carum Petroselinum (Parsley) Extract.",
      price: "3390",
      stock: 14,
      imageUrl: "/unleashla.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Палетка консилеров для лица TFIT Cover Up Pro Concealer",
      slug: "tfit-cover-up-pro-concealer",
      subcategory: "Для лица",
      description:
        "Палетка консилеров TFIT Cover Up Pro Concealer содержит 3 натуральных оттенка, которые подходят для осветления и затемнения отдельных зон лица.\n\nСредство позволяет делать контуринг, точечно перекрывать несовершенства и маскировать темные круги. Имеет плотную текстуру бальзама, легко распределяется пальцами и быстро фиксируется, не окисляется после нанесения.\n\nУвлажняет и смягчает, поддерживает гладкость кожи за счет уходовых компонентов в составе. Водостойкая формула фиксируется на коже до 12 часов.\n\nОсновные действующие компоненты: Пантенол (витамин B5), аминокислоты, ресвератрол, церамиды, постбиотики (Lactobacillus Ferment Lysate), 3 вида гиалуроновой кислоты.",
      usage: "Нанесите на кожу, распределите спонжем, кистью или пальцем.",
      manufacturer: "TFIT",
      activeComponents:
        "Ресвератрол, Пантенол (Витамин B5), Аминокислоты, Гиалуроновая кислота, Церамиды",
      weightGr: 15,
      country: "Южная Корея",
      characteristics:
        "Производитель: TFIT\nАктивные компоненты: Ресвератрол, Пантенол (Витамин B5), Аминокислоты, Гиалуроновая кислота, Церамиды\nВес (гр): 15\nСтрана: Южная Корея",
      composition:
        "Caprylic/Capric Triglyceride, Titanium Dioxide, Polymethyl Methacrylate, Polyisobutene, Isodecyl Neopentanoate, Hydrogenated Castor Oil, Cetearyl Ethylhexanoate, Mica, Dipentaerythrityl Hexahydroxystearate/Hexastearate/Hexarosinate, Diisostearyl Malate, Iron Oxide Yellow, Paraffin, Aluminum Hydroxide, 1,2-Hexanediol, Sorbitan Sesquioleate, Microcrystalline Wax, Iron Oxide Red, Caprylyl Glycol, Methicone, Iron Oxide Black, Tuber Melanosporum Extract, Tuber Magnatum Extract, Resveratrol, Squalane, Panthenol, Lactobacillus Ferment Lysate, Ceramide NP, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate, Glycine, Serine, Glutamic Acid, Aspartic Acid, Leucine, Alanine, Lysine, Arginine, Tyrosine, Phenylalanine, Valine, Threonine, Proline, Isoleucine, Histidine, Methionine, Cysteine, Butylene Glycol, Glycerin, Ethylhexylglycerin, Water, Hydrogenated Lecithin, Polyglyceryl-10 Oleate, Glycolipids",
      price: "1990",
      stock: 18,
      imageUrl: "/tfit.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Увлажняющий праймер WAKEMAKE Stay Fixer Sleek Primer Balm",
      slug: "wakemake-stay-fixer-sleek-primer-balm",
      subcategory: "Для лица",
      description:
        "Увлажняющий праймер WAKEMAKE Stay Fixer Sleek Primer Balm ложится на кожу тонкой вуалью, разглаживает морщины и заломы, вызванные сухостью, придает коже шелковистость и обеспечивает более равномерное нанесение тонального средства.\n\nКремовая текстура продукта легко распределяется, визуально осветляет тон, создает дополнительный увлажняющий слой, благодаря которому тональное покрытие не провоцирует сухости и шелушений, не скатывается и не проваливается в поры.\n\nОсновные действующие компоненты: Аденозин, Ниацинамид (витамин B3), Токоферола ацетат (витамин E). Подходит для сухой, комбинированной и нормальной кожи.",
      usage:
        "Используйте продукт перед нанесением макияжа. Распределите бальзам по коже спонжем и дождитесь полного впитывания.",
      manufacturer: "WAKEMAKE",
      activeComponents: "Ниацинамид (Витамин B3), Токоферол (Витамин E), Аденозин",
      weightGr: 10,
      country: "Южная Корея",
      barcode: "8809971484640",
      characteristics:
        "Производитель: WAKEMAKE\nАктивные компоненты: Ниацинамид (Витамин B3), Токоферол (Витамин E), Аденозин\nВес (гр): 10\nТип кожи: для нормальной кожи, для сухой кожи, для комбинированной кожи\nСтрана: Южная Корея\nШтрихкод: 8809971484640",
      composition:
        "Water, Homosalate, Ethylhexyl Methoxycinnamate, C12-15 Alkyl Benzoate, Ceresin, Dimethicone, Dicaprylyl Carbonate, Ethylhexyl Salicylate, Caprylic/Capric Triglyceride, Titanium Dioxide, Glycerin, Niacinamide, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Polymethylsilsesquioxane, Cetyl PEG/PPG-10/1 Dimethicone, Silica, Methyl Methacrylate Crosspolymer, C30-45 Alkyl Methicone, C30-45 Olefin, Glyceryl Caprylate, Caprylyl Glycol, Lauryl PEG-10 Tris(Trimethylsiloxy)silylethyl Dimethicone, Ethylhexylglycerin, AluminumHydroxide, Triethoxycaprylylsilane, Adenosine, Tocopherol, Fragrance, Ultramarines, Iron Oxide Red",
      price: "2190",
      stock: 13,
      imageUrl: "/wakemake.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Матирующая пудра Milk Touch All Day Perfect Blurring Fixing Pact",
      slug: "milk-touch-all-day-perfect-blurring-fixing-pact",
      subcategory: "Для лица",
      description:
        "Матирующая пудра Milk Touch All Day Perfect Blurring Fixing Pact создает бархатистый финиш, визуально сглаживает микрорельеф и убирает излишний блеск. Обеспечивает легкое покрытие и увеличивает стойкость макияжа.\n\nСредство имеет розоватый оттенок, придает блюр-эффект, помогает скрыть несовершенства и выровнять тон.\n\nОсновные действующие компоненты: Каламин, Токоферол (витамин E), Нитрид бора.",
      usage:
        "Нанесите пудру в качестве завершающего этапа макияжа с помощью спонжа или кисти.",
      manufacturer: "Milk Touch",
      activeComponents: "Каламин, Токоферол (Витамин E)",
      weightGr: 10,
      country: "Южная Корея",
      barcode: "8809684563212",
      characteristics:
        "Производитель: Milk Touch\nАктивные компоненты: Каламин, Токоферол (Витамин E)\nВес (гр): 10\nСтрана: Южная Корея\nШтрихкод: 8809684563212",
      composition:
        "Talc, Silica, Magnesium Stearate, Methyl Methacrylate Crosspolymer, Mica, Caprylic/Capric Triglyceride, Boron Nitride, Triethylhexanoin, Diisostearyl Malate, Phenyl Trimethicone, Dimethicone, Caprylyl Glycol, Titanium Dioxide, Glyceryl Caprylate, Ethylhexylglycerin, Calamine, Yellow Iron Oxide, Red Iron Oxide, Triethoxycaprylylsilane, Tocopherol",
      price: "1890",
      stock: 15,
      imageUrl: "/milktouch.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Компактная палетка теней для век fwee Pocket Eye Palette EP01 Candy Floss",
      slug: "fwee-pocket-eye-palette-ep01-candy-floss",
      subcategory: "Для глаз",
      description:
        "Палетка fwee Pocket Eye Palette содержит 5 оттенков для трендового макияжа глаз: тени с нежной текстурой легко нанести и растушевать подушечками пальцев.\n\nКаждая палетка содержит светлые и темные оттенки для полноценного макияжа, а также шиммер для создания акцента. Палетка-обвес подходит в качестве аксессуара на сумку или косметичку.\n\nТени содержат масло макадамии - увлажняющий компонент, который делает текстуру продукта более муссовой и препятствует сухости кожи.",
      usage: "Нанесите тени на веки кистью или пальцем, затем растушуйте.",
      manufacturer: "fwee",
      activeComponents: "Масло макадамии, Токоферол (Витамин E)",
      weightGr: 6,
      country: "Южная Корея",
      barcode: "8809652588803",
      characteristics:
        "Производитель: fwee\nАктивные компоненты: Масло макадамии, Токоферол (Витамин E)\nВес (гр): 6,6\nСтрана: Южная Корея\nШтрихкод: 8809652588803",
      composition:
        "Talc, Silica, Mica, Methyl Methacrylate Crosspolymer, Phenyl Trimethicone, Titanium Dioxide, Dimethicone, Magnesium Myristate, Calcium Titanium Borosilicate, Manganese Violet, Trihydroxystearin, Macadamia Integrifolia Seed Oil, Ultramarines, Pentaerythrityl Tetraisostearate, Caprylyl Glycol, Glyceryl Caprylate, Carmine, Ethylhexylglycerin, Triethoxycaprylylsilane, Iron Oxides (CI 77499), Aluminum Hydroxide, Kaolin, Tin Oxide, Tocopherol.",
      price: "1790",
      stock: 11,
      imageUrl: "/pocket.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Вельветовый бальзам-пудинг для губ и щек fwee Lip&Cheek Blurry Pudding Pot Keyring Set",
      slug: "fwee-lip-cheek-blurry-pudding-pot-keyring-set",
      subcategory: "Для губ и бровей",
      description:
        "Вельветовый бальзам-пудинг для губ и щек + брелок fwee Lip&Cheek Blurry Pudding Pot Keyring Set - это набор, который позволяет всегда носить с собой любимое средство для макияжа. К бальзаму-пудингу прилагается брелок, в который можно поместить часть средства и прикрепить его к сумке или косметичке.\n\nБальзам представляет собой нежную муссовую текстуру, которая равномерно распределяется и хорошо тушуется, обеспечивает блюр-эффект. Содержит масло какао и экстракт агавы.\n\nКомплектация: бальзам 5 г и брелок.",
      usage: "Нанесите средство на губы или щеки и растушуйте пальцами, кистью или спонжем.",
      manufacturer: "fwee",
      activeComponents: "Какао бобы, Агава",
      weightGr: 4,
      country: "Южная Корея",
      barcode: "8809652586618",
      characteristics:
        "Производитель: fwee\nАктивные компоненты: Какао бобы, Агава\nОбъем (мл): 4\nСтрана: Южная Корея\nШтрихкод: 8809652586618",
      composition:
        "Dimethicone, Dimethicone Crosspolymer, Tribehenin, Diisostearyl Malate, Polyglyceryl-2 Triisostearate, Synthetic Fluorphlogopite, Titanium Dioxide (Ci 77891), Theobroma Cacao (Cocoa) Seed Butter, Agave Tequilana Leaf Extract, Cetyl Peg/Ppg-10/1 Dimethicone, Sorbitan Isostearate, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Polyhydroxystearic Acid, Polyglyceryl-2 Diisostearate, Disteardimonium Hectorite, Ethylhexyl Palmitate, Isopropyl Myristate, Isostearic Acid, Lecithin, Polyglyceryl-3 Polyricinoleate, Triethyl Citrate, Caprylyl Glycol, Glyceryl Caprylate, Butylene Glycol, Water, Fragrance(Parfum), Iron Oxides (Ci 77491), Red 7 Lake (Ci 15850), Yellow 5 Lake (Ci 19140), Iron Oxides (Ci 77492), Iron Oxides (Ci 77499).",
      price: "1690",
      stock: 14,
      imageUrl: "/fwee.png",
      categoryId: makeupCategory?.id,
    },
    {
      name: "Осветляющие пэды с транексамовой кислотой Anua Niacinamide 5 TXA Brightening Pad",
      slug: "anua-niacinamide-5-txa-brightening-pad",
      subcategory: "Тонизирование",
      description:
        "Осветляющие пэды с транексамовой кислотой Anua Niacinamide 5 TXA Brightening Pad эффективно выравнивают тон кожи и придают ей естественное сияние. Помогают уменьшить пигментацию и следы постакне, устраняют тусклый землистый оттенок.\n\nБлагодаря увлажняющим компонентам средство предотвращает сухость и шелушение. Пэды обладают успокаивающим эффектом, при регулярном использовании снижают риск развития воспаления и раздражения.\n\nМягкое отшелушивание способствует обновлению кожи без раздражения, выравниванию текстуры и микрорельефа.\n\nОсновные действующие компоненты: Ниацинамид (витамин B3, 5%), Транексамовая кислота, Цианокобаламин (витамин B12), 6 пептидов, BHA (бетаин салицилат), PHA (глюконолактон). Подходят для нормальной, жирной и комбинированной кожи.",
      usage:
        "После умывания аккуратно протрите лицо. Можно использовать в качестве локальной маски: приложите пэд к коже на 5-10 минут, снимите и дайте впитаться остаткам эссенции.",
      manufacturer: "Anua",
      activeComponents:
        "Ниацинамид (Витамин B3), Транексамовая кислота, Пептиды, Аргинин, PHA-кислоты",
      weightGr: 210,
      country: "Южная Корея",
      barcode: "8809640738128",
      characteristics:
        "Производитель: Anua\nАктивные компоненты: Ниацинамид (Витамин B3), Транексамовая кислота, Пептиды, Аргинин, PHA-кислоты\nОбъем (мл): 210\nТип кожи: для нормальной кожи, для комбинированной кожи, для жирной кожи, для проблемной кожи\nСтрана: Южная Корея\nШтрихкод: 8809640738128",
      composition:
        "Water, Methylpropanediol, Niacinamide (5%), Butylene Glycol, Glycerin, 1,2-hexanediol, Ethylhexylglycerin, Adenosine, Arginine, Carbomer, Disodium Edta, Cyanocobalamin, Betaine Salicylate, Hydrolyzed Sodium Hyaluronate, Madecassoside, Tranexamic Acid (4 ppm), Gluconolactone, Purslane Extract, Grape Seed Extract, Sasanqua Extract, Rice Germ Ferment Filtrate, Oligopeptide-2, Polyglyceryl-10 Laurate, Caprylyl Glycol, Copper Tripeptide-1, Hexapeptide-9, Hexapeptide-11, Palmitoyl Pentapeptide-4, Palmitoyl Tripeptide-1, Tripeptide-1",
      price: "2390",
      stock: 17,
      imageUrl: "/anua.png",
      categoryId: careCategory?.id,
    },
    {
      name: "Шампунь Repair Shampoo Mild Balance",
      slug: "repair-shampoo-mild-balance",
      subcategory: "Шампуни",
      description: "Шампунь для ежедневного использования и мягкого очищения кожи головы.",
      usage: "Нанесите на влажные волосы, вспеньте и смойте водой.",
      manufacturer: "Drama Skin",
      activeComponents: "Мягкие ПАВ, Увлажняющие компоненты",
      weightGr: 300,
      country: "Южная Корея",
      barcode: "8809999991004",
      characteristics:
        "Производитель: Drama Skin\nАктивные компоненты: Мягкие ПАВ\nВес (гр): 300\nСтрана: Южная Корея\nШтрихкод: 8809999991004",
      composition: "Water, Surfactants, Conditioning Agents, Fragrance.",
      price: "1440",
      stock: 20,
      imageUrl: "/tovar2.png",
      categoryId: hairCategory?.id,
    },
    {
      name: "Шампунь против выпадения волос moev Annurcatin™ Shampoo",
      slug: "moev-annurcatin-shampoo",
      subcategory: "Шампуни",
      description:
        "Шампунь moev Annurcatin™ Shampoo тщательно смывает загрязнения, нормализует жирность кожи головы, не вызывает раздражения и сухости.\n\nСтимулирует микроциркуляцию фолликулов и укрепляет корни, за счет чего повышает прочность, препятствует ломкости и сечению. Делает волосы блестящими, мягкими и послушными.\n\nХорошо пенится, придает тонкий цветочный аромат с нотами яблока, лимона, розы, жасмина, мускуса и сандала. Уровень pH 5.0-6.0.\n\nСодержит запатентованный комплекс Annurcatin™ 2%, состоящий из экстракта яблок сорта аннурка, 22 аминокислот и биотина (витамин B7). Дополнительные действующие компоненты: Климбазол, Кофеин, Ниацинамид, Aquaxyl, гидролизованный кератин и гидролизованный коллаген. Подходит для всех типов волос.",
      usage:
        "Нанесите шампунь на влажную кожу головы, распределите круговыми движениями, массируйте в течение 2-3 минут и смойте водой.",
      manufacturer: "moev",
      activeComponents: "Аминокислоты, Биотин, Кератин, Кофеин, Коллаген",
      weightGr: 300,
      country: "Южная Корея",
      barcode: "8809918990852",
      characteristics:
        "Производитель: moev\nАктивные компоненты: Аминокислоты, Биотин, Кератин, Кофеин, Коллаген\nОбъем (мл): 300\nТип кожи: для сухих волос, для жирной кожи головы, для сухой кожи головы\nСтрана: Южная Корея\nШтрихкод: 8809918990852",
      composition:
        "Water, Disodium Laureth Sulfosuccinate, Sodium Cocoyl Isethionate, Cocamide MIPA, Lauryl Hydroxysultaine, Lauryl Glucoside, Lauryl Betaine, Butylene Glycol, 1,2-Hexanediol, Caffeine, Fragrance, Sodium Chloride, Coconut Acid, Climbazole, Polyquaternium-10, Xylitylglucoside, Anhydroxylitol, Maltitol, Xylitol, Centella Asiatica Extract, Sodium Isethionate, Ethylhexylglycerin, Niacinamide, Glycerin, Malus Domestica (Apple) Fruit Extract, Biotin, Glycine, Glutamic Acid, Glutamine, Lysine, Leucine, Methionine, Valine, Serine, Cystine, Asparagine, Aspartic Acid, Isoleucine, Alanine, Arginine, Ornithine, Carnitine, Tyrosine, Threonine, Tryptophan, Phenylalanine, Proline, Histidine, Caprylyl Glycol, Hydrogenated Lecithin, Ceramide NP, Hydrolyzed Silk, Hydrolyzed Keratin, Hydrolyzed Collagen, Hydrolyzed Soy Protein, Hydrolyzed Oat Protein, Hydrolyzed Wheat Protein, Ethylhexylglycerin, Disodium EDTA, Sodium Benzoate, Dipropylene Glycol, Benzoic Acid, Linalool, Limonene, Benzyl Benzoate, Benzyl Salicylate, Citral, Citronellol, Alpha-Isomethyl Ionone, Geraniol, Coumarin, Hexyl Cinnamal.",
      price: "2090",
      stock: 19,
      imageUrl: "/moew.png",
      categoryId: hairCategory?.id,
    },
    {
      name: "Восстанавливающий бальзам для поврежденных волос Lador PRO CMC Balm",
      slug: "lador-pro-cmc-balm",
      subcategory: "Кондиционеры",
      description:
        "Бальзам Lador PRO CMC Balm восстанавливает волосы, интенсивно питает и увлажняет. Образует защитный слой, который препятствует потере влаги.\n\nПредотвращает сухость, ломкость и электризуемость, повышает устойчивость к механическому и термическому воздействию. Делает волосы мягкими и блестящими, облегчает расчесывание.\n\nОсновные действующие компоненты: Pro CMC Core 7, Лецитин, масла баобаба и сои, Кератин, Эластин, Желатин. Подходит для сухих и поврежденных волос.",
      usage:
        "После мытья шампунем нанесите кондиционер на волосы по длине, смойте водой через 2-3 минуты.",
      manufacturer: "Lador",
      activeComponents: "Церамиды, Баобаб, Соя, Липиды, Протеины",
      weightGr: 310,
      country: "Южная Корея",
      barcode: "8809982980308",
      characteristics:
        "Производитель: Lador\nАктивные компоненты: Церамиды, Баобаб, Соя, Липиды, Протеины\nВес (гр): 310\nТип кожи: для поврежденных волос, для сухих волос, для всех типов волос\nСтрана: Южная Корея\nШтрихкод: 8809982980308",
      composition:
        "Water, Butylene Glycol, Glycerin, Cetearyl Alcohol, Dimethicone, Propylene Glycol, Behentrimonium Chloride, Dipropylene Glycol, Hydrogenated Polydecene, Gardenia Tahitensis Flower Extract, Dextrin, Avena Sativa (Oat) Kernel Protein Extract, Glycine Soja (Soybean) Oil, Hydrogenated Lecithin, Elastin, Keratin, Gelatin, Cholesterol, Quaternium-33, Ceramide NP, Adansonia Digitata Seed Oil, Ceramide AS, Ceramide NS, Ceramide AP, Ceramide EOP, Sodium Hyaluronate, Carrageenan, Polyglyceryl-10 Laurate, Polyglyceryl-4 Caprate, Polyquaternium-7, Stearic Acid, Caprylyl Glycol, Caprylic/Capric Triglyceride, Sodium Benzoate, Phenoxyethanol, 1,2-Hexanediol, Tocopherol, Disodium EDTA, Parfum, Hexyl Cinnamal, Benzyl Benzoate, Linalool, Alpha-Isomethyl Ionone, Citronellol, Benzyl Salicylate, Geraniol, Limonene, Benzyl Alcohol, Eugenol",
      price: "2390",
      stock: 12,
      imageUrl: "/lador.png",
      categoryId: hairCategory?.id,
    },
    {
      name: "Лосьон для тела Body Lotion Cica Comfort",
      slug: "body-lotion-cica-comfort",
      subcategory: "Уход",
      description: "Лосьон для тела с успокаивающим эффектом и длительным увлажнением.",
      usage: "Нанесите на чистую кожу тела мягкими массажными движениями.",
      manufacturer: "Drama Skin",
      activeComponents: "Центелла, Пантенол, Увлажняющие комплексы",
      weightGr: 250,
      country: "Южная Корея",
      barcode: "8809999991005",
      characteristics:
        "Производитель: Drama Skin\nАктивные компоненты: Центелла, Пантенол\nВес (гр): 250\nСтрана: Южная Корея\nШтрихкод: 8809999991005",
      composition: "Water, Emollients, Panthenol, Centella Asiatica Extract, Preservatives.",
      price: "2250",
      stock: 10,
      imageUrl: "/tovar4.png",
      categoryId: bodyCategory?.id,
    },
  ];

  for (const product of products) {
    if (!product.categoryId) continue;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        subcategory: product.subcategory,
        description: product.description,
        usage: product.usage,
        manufacturer: product.manufacturer,
        activeComponents: product.activeComponents,
        weightGr: product.weightGr,
        country: product.country,
        barcode: product.barcode,
        characteristics: product.characteristics,
        composition: product.composition,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        isPublished: true,
      },
      create: {
        ...product,
        isPublished: true,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@dramma.local" },
    update: {
      role: UserRole.ADMIN,
      firstName: "Admin",
      lastName: "Dramma",
    },
    create: {
      email: "admin@dramma.local",
      role: UserRole.ADMIN,
      firstName: "Admin",
      lastName: "Dramma",
    },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
