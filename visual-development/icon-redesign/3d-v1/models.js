import {
  T,
  TAU,
  mats,
  material,
  group,
  mesh,
  box,
  ball,
  cyl,
  disc,
  ring,
  tube,
  polygon,
  extrude,
  symbol,
  arcShape,
  starShape,
  arrowPoints,
  check,
  crate,
  port,
  svgShapes,
  svgRelief,
  bake,
  pulse,
} from './geometry.js';

const definitions = [
  [
    'coin',
    'Кредити',
    'Монета робить підкид із повним обертом і м’яко сідає.',
    'Інтерфейс',
  ],
  [
    'crystal',
    'Кристал',
    'Грані повільно повертаються й нахиляються, відкриваючи форму кристала.',
    'Інтерфейс',
  ],
  [
    'mining',
    'Видобуток',
    'Бур розкручується, висувається й повертається в корпус.',
    'Техніка',
  ],
  [
    'transport',
    'Транспорт',
    'Човен проходить короткий маршрут; гвинт працює, корпус крениться.',
    'Техніка',
  ],
  [
    'processing',
    'Переробка',
    'Поршень прокачує сировину; рівень у резервуарі підіймається й спадає.',
    'Техніка',
  ],
  [
    'storage',
    'Склад',
    'Ворота підіймаються, ящик виїжджає на приймальний майданчик.',
    'Техніка',
  ],
  [
    'map',
    'Карта',
    'Складена карта розкриває бічні секції, пін позначає точку маршруту.',
    'Інтерфейс',
  ],
  [
    'sonar',
    'Сонар',
    'Промінь обертається, а кільця й контакт відповідають на сканування.',
    'Інтерфейс',
  ],
  [
    'prestige',
    'Престиж',
    'Зірка розвертається, а знак досягнення встає на своє місце.',
    'Інтерфейс',
  ],
  [
    'research',
    'Дослідження',
    'У камері зразка рухаються гілочки; верхній сканер проходить над ними.',
    'Інтерфейс',
  ],
  [
    'trade-network',
    'Торгова мережа',
    'Дві стрілки передають рух одна одній у протилежних напрямках.',
    'Інтерфейс',
  ],
  [
    'modular-storage',
    'Модульний склад',
    'Три контейнери по черзі розбираються й складаються в стос.',
    'Інтерфейс',
  ],
  [
    'missions',
    'Завдання',
    'Лист на планшеті піднімається, а галочка підтверджує виконання.',
    'Інтерфейс',
  ],
  [
    'trophy',
    'Трофей',
    'Кубок святково нахиляється; емблема робить короткий уклін.',
    'Інтерфейс',
  ],
  [
    'refresh',
    'Оновлення',
    'Кругова стрілка набирає оберт і проходить повний цикл.',
    'Керування',
  ],
  [
    'settings',
    'Налаштування',
    'Шестерня переходить на один зубець за крок, втулка рухається назустріч.',
    'Керування',
  ],
  [
    'lock',
    'Замок',
    'Дужка підіймається, відвертається й замикається назад.',
    'Керування',
  ],
  [
    'play',
    'Старт',
    'Трикутник подається вперед із коротким пружним відгуком.',
    'Керування',
  ],
  [
    'pause',
    'Пауза',
    'Дві клавіші натискаються по черзі й зупиняються разом.',
    'Керування',
  ],
  [
    'close',
    'Закрити',
    'Плечі хрестика розходяться, перехрещуються й фіксуються.',
    'Керування',
  ],
  [
    'arrow',
    'Напрямок',
    'Стрілка двічі вказує шлях короткими рухами вперед.',
    'Керування',
  ],
  [
    'robot',
    'Помічник',
    'Робот оглядається, кліпає очима й ворушить антеною.',
    'Інтерфейс',
  ],
  [
    'cloud',
    'Збереження',
    'Стрілка проходить крізь хмару; частини хмари м’яко розсуваються.',
    'Інтерфейс',
  ],
  [
    'check',
    'Підтвердити',
    'Галочка розгортається від короткого плеча до довгого.',
    'Керування',
  ],
  [
    'depth',
    'Глибина',
    'Стрілка занурюється повз три послідовні відмітки глибини.',
    'Інтерфейс',
  ],
  [
    'profile',
    'Профіль',
    'Шолом повертає ілюмінатор, боковий вентиль прокручується.',
    'Інтерфейс',
  ],
  [
    'camera',
    'Камера',
    'Об’єктив висувається й фокусується, кнопка спускає затвор.',
    'Інтерфейс',
  ],
  [
    'trash',
    'Видалення',
    'Кришка відкидається на петлі, контейнер робить короткий струс.',
    'Керування',
  ],
  [
    'cookie',
    'Cookies',
    'Печиво хитнеться; чотири крихти по черзі втискаються в тісто.',
    'Інтерфейс',
  ],
  [
    'database',
    'База даних',
    'Три диски розсуваються; індикатор запису переходить згори вниз.',
    'Інтерфейс',
  ],
  [
    'analytics',
    'Статистика',
    'Стовпчики послідовно виростають до трьох різних значень.',
    'Інтерфейс',
  ],
  [
    'logout',
    'Вихід',
    'Дверцята відчиняються, стрілка проходить крізь раму.',
    'Керування',
  ],
  [
    'resource-gold',
    'Золото',
    'Злиток перекочується з однієї скошеної грані на іншу.',
    'Ресурси',
  ],
  [
    'resource-pearl',
    'Перлина',
    'Перлина погойдується на опорній точці й повертає перламутровий бік.',
    'Ресурси',
  ],
  [
    'resource-alloy',
    'Сплав',
    'Броньовані грані розкривають внутрішній метал і змикаються.',
    'Ресурси',
  ],
  [
    'resource-core',
    'Енергоядро',
    'Три захисні затискачі відходять, лінза ядра пульсує.',
    'Ресурси',
  ],
  [
    'email',
    'Пошта',
    'Клапан конверта відкривається, лист виходить назовні.',
    'Інтерфейс',
  ],
  [
    'brand-abyss',
    'Abyss Corp',
    'Фірмовий човен вітає нахилом носа, хвостовий гвинт дає короткий поштовх.',
    'Техніка',
  ],
  [
    'provider-google',
    'Google',
    'Чотири кольорові частини G розсуваються й збираються по черзі.',
    'Вхід',
  ],
  [
    'provider-facebook',
    'Facebook',
    'Літера f піднімається над плиткою й м’яко повертається.',
    'Вхід',
  ],
  [
    'provider-discord',
    'Discord',
    'Маскот кивне; вічка по черзі підморгують.',
    'Вхід',
  ],
  [
    'provider-github',
    'GitHub',
    'Octocat махає хвостом і нахиляє вушка.',
    'Вхід',
  ],
  [
    'provider-twitch',
    'Twitch',
    'Рамка повідомлення відгукується на два послідовні рухи штрихів.',
    'Вхід',
  ],
  [
    'provider-x',
    'X',
    'Дві діагоналі відкриваються навколо центра й замикаються в X.',
    'Вхід',
  ],
  [
    'provider-telegram',
    'Telegram',
    'Паперовий літак вилітає з жетона й повертається по дузі.',
    'Вхід',
  ],
  [
    'provider-steam',
    'Steam',
    'Шатун Steam обертається навколо верхнього шарніра.',
    'Вхід',
  ],
  [
    'provider-linkedin',
    'LinkedIn',
    'Крапка i підстрибує, а літера n вітає коротким нахилом.',
    'Вхід',
  ],
  [
    'provider-microsoft',
    'Microsoft',
    'Чотири плитки відкриваються віялом по черзі.',
    'Вхід',
  ],
];
export const catalog = definitions.map(([id, label, motion, family], i) => ({
  id,
  label,
  motion,
  family,
  index: i + 1,
  reference: `../v1/${id}.png`,
  model: `models/${id}.glb`,
}));
let providerSources;
export async function prepare(
  readText = async (url) => (await fetch(url)).text(),
) {
  providerSources = Object.fromEntries(
    await Promise.all(
      catalog
        .filter((x) => x.id.startsWith('provider-'))
        .map(async (x) => [
          x.id,
          await readText(`../v1/originals/${x.id}.svg`),
        ]),
    ),
  );
}
const builders = {};
function asset(id) {
  const r = new T.Group();
  r.name = id.replaceAll('-', '_');
  return r;
}
function finish(root, nodes, duration, fn) {
  const clip = bake(root, nodes, duration, fn);
  root.userData = {
    id: catalog.find((c) => c.id.replaceAll('-', '_') === root.name)?.id,
    author: 'Abyss Corp · local 3D study',
    version: 1,
  };
  return { root, clip };
}

builders.coin = () => {
  const r = asset('coin'),
    g = group(r, 'coin');
  disc(g, 0.94, 0.24, 'edge');
  disc(g, 0.87, 0.27, 'gold');
  ring(g, 0.75, 0.055, 'cream', [0, 0, 0.18]);
  const c = extrude(
    g,
    arcShape(0.43, 0.27, 0.7, TAU - 0.7),
    0.1,
    'edge',
    [0, 0, 0.17],
    0.04,
  );
  return finish(r, [g], 3.8, (u) => {
    const a = pulse(u, 0.15, 0.85);
    g.position.y = 0.55 * a;
    g.rotation.y = TAU * (u < 0.15 ? 0 : u > 0.85 ? 1 : (u - 0.15) / 0.7);
    g.rotation.z = 0.14 * Math.sin(TAU * u);
  });
};
builders.crystal = () => {
  const r = asset('crystal'),
    g = group(r, 'crystal');
  const verts = [],
    rings = [
      { y: -0.84, r: 0.16, phase: 0.1 },
      { y: -0.33, r: 0.6, phase: 0 },
      { y: 0.43, r: 0.49, phase: 0.15 },
      { y: 0.76, r: 0.29, phase: 0.15 },
    ],
    n = 6;
  for (const a of rings)
    for (let i = 0; i < n; i++) {
      let t = (i * TAU) / n + a.phase;
      verts.push(
        Math.cos(t) * a.r - (a.y > 0.4 ? 0.08 : 0),
        a.y + (a.y > 0.4 ? 0.11 * Math.cos(t) : 0),
        Math.sin(t) * a.r,
      );
    }
  const idx = [];
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i,
        b = j * n + ((i + 1) % n);
      idx.push(a, b, a + n, b, b + n, a + n);
    }
  for (let i = 1; i < n - 1; i++) {
    idx.push(0, i + 1, i);
    idx.push(3 * n, 3 * n + i, 3 * n + i + 1);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  const colors = [];
  const shades = [
    '#38b7cb',
    '#267f99',
    '#63cedc',
    '#1d728e',
    '#85dce3',
    '#34a6bb',
  ].map((c) => new T.Color(c));
  for (let i = 0; i < flat.attributes.position.count; i++) {
    const c = shades[Math.floor(i / 6) % 6];
    colors.push(c.r, c.g, c.b);
  }
  flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  mesh(
    g,
    flat,
    new T.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.13,
      roughness: 0.22,
    }),
  );
  return finish(r, [g], 6, (u) => {
    g.rotation.y = TAU * u;
    g.rotation.z = 0.13 * Math.sin(TAU * u);
    g.rotation.x = 0.11 * Math.sin(TAU * u * 2);
  });
};
builders.mining = () => {
  const r = asset('mining');
  box(r, 1.45, 0.2, 1.2, 'teal', [0, -0.8, 0]);
  for (const x of [-0.62, 0.62])
    for (const z of [-0.42, 0.42])
      box(r, 0.2, 0.45, 0.25, 'teal', [x, -0.54, z]);
  box(r, 1.2, 1.1, 0.95, 'gold', [0, 0.02, -0.12], 0.16);
  box(r, 0.53, 0.28, 0.08, 'teal', [0, 0.24, 0.39]);
  box(r, 0.4, 0.14, 0.08, 'glass', [0, 0.24, 0.45]);
  const d = group(r, 'drill', [0, -0.15, 0.5]);
  disc(d, 0.42, 0.23, 'teal');
  disc(d, 0.32, 0.22, 'silver', [0, 0, 0.18]);
  const cone = mesh(
    d,
    new T.ConeGeometry(0.3, 0.93, 32),
    'silver',
    [0, 0, 0.65],
    [Math.PI / 2, 0, 0],
  );
  const points = Array.from({ length: 95 }, (_, i) => {
    const q = i / 94,
      t = q * TAU * 4;
    return [
      Math.cos(t) * (0.3 * (1 - q) + 0.018),
      Math.sin(t) * (0.3 * (1 - q) + 0.018),
      0.23 + q * 0.89,
    ];
  });
  tube(d, points, 0.024, 'teal');
  return finish(r, [d], 3.6, (u) => {
    d.rotation.z = -TAU * u * 4;
    d.position.z = 0.5 + 0.2 * pulse(u, 0.18, 0.84);
  });
};
function submarine(id, brand = false) {
  const r = asset(id),
    g = group(r, 'hull');
  ball(g, 0.67, 'cream', [0, 0, 0], [1.65, 0.91, 1]);
  for (const x of [-0.78, 0.78]) {
    const band = cyl(g, 0.55, 0.19, 'gold', [x, 0, 0]);
    band.rotation.z = Math.PI / 2;
  }
  const front = group(g, 'bow', [0.89, 0, 0]);
  front.rotation.y = Math.PI / 2;
  port(front, 0.44, [0, 0, 0.08]);
  const rear = group(g, 'propeller_mount', [-1.17, 0, 0]);
  rear.rotation.y = -Math.PI / 2;
  ring(rear, 0.41, 0.075, 'gold');
  disc(rear, 0.15, 0.25, 'teal');
  const prop = group(rear, 'rotor', [0, 0, 0.04]);
  for (let i = 0; i < 3; i++) {
    const b = box(prop, 0.13, 0.59, 0.07, 'silver', [0, 0, 0], 0.04);
    b.position.set(
      Math.sin((i * TAU) / 3) * 0.17,
      Math.cos((i * TAU) / 3) * 0.17,
      0,
    );
    b.rotation.z = (-i * TAU) / 3;
  }
  symbol(
    g,
    [
      [-0.3, 0],
      [-0.23, 0.36],
      [-0.04, 0.36],
      [0.18, 0],
    ],
    'gold',
    0.16,
    [0, 0.52, -0.08],
    0.045,
  );
  box(g, 0.62, 0.07, 1.55, 'gold', [-0.25, -0.27, 0], 0.07);
  box(g, 0.24, 0.15, 0.04, 'teal', [-0.29, 0.05, 0.62], 0.025);
  box(g, 0.16, 0.08, 0.05, 'glass', [-0.29, 0.05, 0.65], 0.015);
  for (const z of [-0.37, 0.37]) ball(g, 0.09, 'white', [0.94, -0.36, z]);
  return finish(r, [g, prop], brand ? 4.8 : 5, (u) => {
    prop.rotation.z = TAU * u * (brand ? 5 : 10);
    g.position.x = (brand ? 0.1 : 0.28) * Math.sin(TAU * u);
    g.position.y = 0.13 * Math.sin(TAU * u + (brand ? 0 : 0.3));
    g.rotation.z = (brand ? 0.18 : 0.06) * Math.sin(TAU * u);
    g.rotation.y = 0.12 * Math.sin(TAU * u * 2);
  });
}
builders.transport = () => submarine('transport');
builders['brand-abyss'] = () => submarine('brand-abyss', true);
builders.processing = () => {
  const r = asset('processing');
  cyl(r, 0.77, 0.2, 'teal', [0, -0.88, 0]);
  cyl(r, 0.69, 1.65, 'cream', [0, 0, 0]);
  const glass = mesh(
    r,
    new T.CylinderGeometry(
      0.705,
      0.705,
      0.85,
      40,
      1,
      true,
      -Math.PI * 0.39,
      Math.PI * 0.78,
    ),
    'teal',
    [0, -0.02, 0],
  );
  const fluid = group(r, 'fluid', [0, -0.43, 0]);
  mesh(
    fluid,
    new T.CylinderGeometry(
      0.718,
      0.718,
      0.7,
      40,
      1,
      true,
      -Math.PI * 0.37,
      Math.PI * 0.74,
    ),
    'glass',
    [0, 0.35, 0],
  );
  for (const y of [-0.48, 0.44]) {
    const rr = ring(r, 0.71, 0.035, 'gold', [0, y, 0]);
    rr.rotation.x = Math.PI / 2;
  }
  const lid = group(r, 'pressure_lid', [0, 0.84, 0]);
  cyl(lid, 0.69, 0.16, 'cream');
  const roundedLip = ring(lid, 0.63, 0.065, 'cream', [0, 0.075, 0]);
  roundedLip.rotation.x = Math.PI / 2;
  cyl(lid, 0.4, 0.04, 'white', [0, 0.1, 0]);
  tube(
    r,
    [
      [0.6, -0.15, 0],
      [0.95, -0.15, 0],
      [1.04, -0.38, 0],
      [1.04, -0.8, 0],
    ],
    0.12,
    'silver',
  );
  cyl(r, 0.21, 0.12, 'teal', [1.04, -0.86, 0]);
  const piston = cyl(r, 0.12, 0.2, 'gold', [1.04, -0.54, 0]);
  return finish(r, [fluid, lid, piston], 4, (u) => {
    const v = 0.5 + 0.5 * Math.sin(TAU * u);
    fluid.scale.y = 0.25 + 0.75 * v;
    lid.position.y = 0.84 + 0.04 * Math.sin(TAU * u * 2);
    piston.position.y = -0.54 + 0.12 * Math.sin(TAU * u * 2);
  });
};
builders.storage = () => {
  const r = asset('storage');
  box(r, 1.9, 0.2, 1.3, 'teal', [0, -0.78, 0]);
  box(r, 0.31, 1.3, 1.13, 'cream', [-0.745, -0.05, -0.1], 0.1);
  box(r, 0.31, 1.3, 1.13, 'cream', [0.745, -0.05, -0.1], 0.1);
  box(r, 1.2, 0.26, 1.13, 'cream', [0, 0.47, -0.1], 0.07);
  box(r, 1.3, 1.15, 0.12, 'teal', [0, -0.05, -0.61], 0.05);
  for (const x of [-0.6, 0.6])
    box(r, 0.1, 1.05, 0.1, 'teal', [x, -0.16, 0.5], 0.025);
  box(r, 1.3, 0.1, 0.1, 'teal', [0, 0.39, 0.5], 0.025);
  const roofShape = new T.Shape();
  roofShape.moveTo(-1, -0.04);
  roofShape.lineTo(-1, 0.05);
  roofShape.quadraticCurveTo(0, 0.95, 1, 0.05);
  roofShape.lineTo(1, -0.04);
  roofShape.closePath();
  extrude(r, roofShape, 1.35, 'gold', [0, 0.55, -0.77], 0.07);
  const gate = group(r, 'roller_gate', [0, 0.12, 0.43]);
  box(gate, 1.02, 0.58, 0.09, 'gold');
  for (const y of [-0.18, 0, 0.18])
    box(gate, 0.94, 0.025, 0.04, 'edge', [0, y, 0.06], 0.01);
  const cargo = crate(r, [0, -0.41, 0.61], 0.55);
  for (const x of [-0.74, 0.74]) {
    box(r, 0.13, 0.4, 0.07, 'teal', [x, 0.06, 0.51], 0.03);
    box(r, 0.07, 0.28, 0.07, 'glass', [x, 0.06, 0.56], 0.02);
  }
  return finish(r, [gate, cargo], 5.2, (u) => {
    const open = pulse(u, 0.06, 0.94);
    gate.position.y = 0.12 + 0.64 * Math.min(1, open * 2);
    cargo.position.z = 0.61 + 0.58 * pulse(u, 0.26, 0.8);
  });
};
builders.map = () => {
  const r = asset('map');
  const center = box(r, 0.7, 1.45, 0.1, 'cream');
  const left = group(r, 'left_fold', [-0.35, 0, 0]),
    right = group(r, 'right_fold', [0.35, 0, 0]);
  box(left, 0.65, 1.45, 0.1, 'cream', [-0.325, 0, 0]);
  box(right, 0.65, 1.45, 0.1, 'cream', [0.325, 0, 0]);
  for (const [p, x] of [
    [r, 0],
    [left, -0.325],
    [right, 0.325],
  ]) {
    box(p, 0.59, 0.07, 0.05, 'gold', [x, 0.72, 0.05], 0.02);
    box(p, 0.59, 0.07, 0.05, 'gold', [x, -0.72, 0.05], 0.02);
    for (let i = 0; i < 5; i++) {
      ball(
        p,
        0.034,
        'teal',
        [x - 0.24 + i * 0.12, -0.08 + 0.1 * Math.sin(i * 1.2), 0.09],
        [1, 1, 0.35],
      );
    }
    symbol(
      p,
      [
        [-0.26, 0.37],
        [-0.16, 0.56],
        [0.05, 0.51],
        [0.2, 0.38],
        [0.09, 0.24],
        [-0.04, 0.31],
        [-0.15, 0.25],
      ],
      'cyan',
      0.018,
      [x, 0, 0.06],
      0.008,
    );
    symbol(
      p,
      [
        [-0.24, -0.48],
        [-0.1, -0.27],
        [0.1, -0.37],
        [0.23, -0.57],
        [-0.1, -0.61],
      ],
      'cyan',
      0.018,
      [x, 0, 0.06],
      0.008,
    );
  }
  const pin = group(right, 'pin', [0.31, 0.19, 0.16]);
  disc(pin, 0.22, 0.1, 'cyan');
  ring(pin, 0.12, 0.034, 'teal', [0, 0, 0.08]);
  symbol(
    pin,
    [
      [-0.17, -0.09],
      [0, -0.42],
      [0.17, -0.09],
    ],
    'cyan',
    0.1,
  );
  return finish(r, [left, right, pin], 5, (u) => {
    left.rotation.y = 0.5 + 0.42 * Math.cos(TAU * u);
    right.rotation.y = -0.5 - 0.42 * Math.cos(TAU * u);
    pin.position.y = 0.19 + 0.12 * pulse(u, 0.25, 0.7);
  });
};
builders.sonar = () => {
  const r = asset('sonar');
  for (const x of [-0.58, 0.58])
    box(r, 0.32, 0.24, 0.65, 'teal', [x, -0.88, -0.02]);
  disc(r, 0.88, 0.4, 'cream');
  disc(r, 0.74, 0.43, 'teal');
  ring(r, 0.75, 0.05, 'silver', [0, 0, 0.26]);
  const echoes = [];
  for (const rad of [0.22, 0.43, 0.64])
    echoes.push(ring(r, rad, 0.014, 'cyan', [0, 0, 0.245]));
  const sweep = group(r, 'sweep', [0, 0, 0.27]);
  tube(
    sweep,
    [
      [0, 0, 0],
      [0.15, 0.28, 0],
      [0.3, 0.58, 0],
    ],
    0.028,
    'cyan',
  );
  const spot = ball(r, 0.075, 'gold', [0.34, 0.3, 0.29]);
  return finish(r, [sweep, spot, ...echoes], 4, (u) => {
    sweep.rotation.z = -TAU * u;
    spot.scale.setScalar(0.5 + 1.1 * pulse(u, 0.05, 0.5));
    echoes.forEach((e, i) =>
      e.scale.setScalar(1 + 0.06 * Math.sin(TAU * u - i * 0.8)),
    );
  });
};
builders.prestige = () => {
  const r = asset('prestige'),
    s = group(r, 'star');
  extrude(s, starShape(), 0.24, 'edge');
  const inner = extrude(s, starShape(0.84, 0.44), 0.18, 'gold', [0, 0, 0.22]);
  const c = check(s, 0.55, [0, 0, 0.45]);
  return finish(r, [s, c], 4.6, (u) => {
    s.rotation.y = 0.35 * Math.sin(TAU * u);
    s.rotation.z = 0.11 * Math.sin(TAU * u * 2);
    c.position.z = 0.45 + 0.25 * pulse(u, 0.15, 0.7);
    c.scale.setScalar(0.55 * (1 + 0.15 * pulse(u, 0.3, 0.8)));
  });
};
builders.research = () => {
  const r = asset('research');
  box(r, 1.22, 1.22, 0.12, 'teal', [0, 0, -0.52]);
  // Open specimen front with an actual three-dimensional coral sample.
  box(r, 1.08, 1.12, 0.08, 'cyan', [0, 0, -0.53]);
  box(r, 1.1, 0.16, 1.1, 'cream', [0, -0.55, 0]);
  for (const x of [-0.56, 0.56])
    for (const z of [-0.5, 0.5])
      box(r, 0.16, 1.4, 0.16, 'gold', [x, 0, z], 0.04);
  for (const y of [-0.62, 0.62]) {
    box(r, 1.3, 0.15, 1.15, 'cream', [0, y, 0]);
    box(r, 1.32, 0.13, 0.12, 'gold', [0, y, 0.57]);
  }
  const coral = group(r, 'specimen', [0, -0.47, 0.2]);
  tube(
    coral,
    [
      [0, 0, 0],
      [0, 0.3, 0],
      [0.1, 0.65, 0],
    ],
    0.06,
    'glass',
  );
  tube(
    coral,
    [
      [0, 0.17, 0],
      [-0.22, 0.35, 0],
      [-0.3, 0.53, 0],
    ],
    0.055,
    'glass',
  );
  tube(
    coral,
    [
      [0.04, 0.35, 0],
      [0.27, 0.4, 0],
      [0.32, 0.6, 0],
    ],
    0.05,
    'glass',
  );
  box(
    r,
    1.06,
    1.08,
    0.025,
    new T.MeshStandardMaterial({
      color: '#63d9e4',
      transparent: true,
      opacity: 0.16,
      roughness: 0.24,
      metalness: 0.05,
      depthWrite: false,
    }),
    [0, 0, 0.54],
    0.008,
  );
  const scan = box(r, 0.95, 0.035, 0.13, 'glass', [0, 0.4, 0.48], 0.012);
  return finish(r, [coral, scan], 5, (u) => {
    coral.rotation.z = 0.1 * Math.sin(TAU * u);
    coral.rotation.y = 0.18 * Math.sin(TAU * u * 2);
    scan.position.y = 0.43 - 0.8 * (0.5 - 0.5 * Math.cos(TAU * u));
  });
};
function curvedArrow(p, mat, start, end) {
  const g = group(p, 'curved_arrow');
  extrude(g, arcShape(0.76, 0.48, start, end), 0.2, mat, [0, 0, 0], 0.055);
  const x = Math.cos(end) * 0.62,
    y = Math.sin(end) * 0.62;
  const h = symbol(
    g,
    [
      [-0.3, -0.26],
      [0.32, 0],
      [-0.3, 0.26],
    ],
    mat,
    0.2,
    [x, y, 0],
    0.05,
  );
  h.rotation.z = end + Math.PI / 2;
  return g;
}
builders['trade-network'] = () => {
  const r = asset('trade-network'),
    a = curvedArrow(r, 'gold', 0.15, Math.PI - 0.2),
    b = curvedArrow(r, 'cyan', Math.PI + 0.15, TAU - 0.2);
  return finish(r, [a, b], 4, (u) => {
    a.position.x = 0.18 * Math.sin(TAU * u);
    a.position.z = 0.08 * pulse(u, 0, 0.5);
    b.position.x = -0.18 * Math.sin(TAU * u);
    b.position.z = 0.08 * pulse(u, 0.5, 1);
  });
};
builders['modular-storage'] = () => {
  const r = asset('modular-storage'),
    a = crate(r, [-0.43, -0.43, 0], 0.76),
    b = crate(r, [0.43, -0.43, 0], 0.76),
    c = crate(r, [0, 0.4, 0], 0.76);
  return finish(r, [a, b, c], 5.4, (u) => {
    const v = pulse(u, 0.05, 0.95);
    a.position.x = -0.43 - 0.22 * v;
    b.position.x = 0.43 + 0.22 * v;
    c.position.y = 0.4 + 0.44 * v;
    c.rotation.y = 0.18 * Math.sin(TAU * u);
  });
};
builders.missions = () => {
  const r = asset('missions');
  box(r, 1.4, 1.85, 0.21, 'teal');
  const paper = group(r, 'paper', [0, 0, 0.14]);
  box(paper, 1.19, 1.59, 0.07, 'cream');
  const c = check(paper, 0.55, [0, -0.03, 0.12]);
  box(r, 0.65, 0.23, 0.22, 'gold', [0, 0.85, 0.2]);
  disc(r, 0.08, 0.05, 'edge', [0, 0.89, 0.33]);
  return finish(r, [paper, c], 4.2, (u) => {
    paper.rotation.x = -0.12 * pulse(u, 0.05, 0.85);
    c.scale.setScalar(0.55 * (1 + 0.18 * pulse(u, 0.25, 0.65)));
    c.position.z = 0.12 + 0.13 * pulse(u, 0.25, 0.65);
  });
};
builders.trophy = () => {
  const r = asset('trophy');
  cyl(r, 0.52, 0.17, 'teal', [0, -0.9, 0]);
  cyl(r, 0.4, 0.12, 'gold', [0, -0.76, 0]);
  const g = group(r, 'cup', [0, -0.63, 0]);
  cyl(g, 0.13, 0.55, 'gold', [0, 0.25, 0]);
  const pts = [
    [0.12, 0.4],
    [0.3, 0.5],
    [0.48, 0.72],
    [0.58, 1.05],
    [0.59, 1.2],
    [0.51, 1.2],
    [0.48, 1.04],
    [0.4, 0.78],
    [0.25, 0.6],
    [0.12, 0.55],
  ].map((x) => new T.Vector2(...x));
  mesh(g, new T.LatheGeometry(pts, 48), 'gold');
  for (const x of [-1, 1]) {
    const h = ring(g, 0.3, 0.075, 'gold', [x * 0.58, 0.85, 0]);
    h.scale.y = 1.12;
  }
  const emblem = disc(g, 0.15, 0.05, 'edge', [0, 0.91, 0.61]);
  return finish(r, [g, emblem], 5, (u) => {
    g.rotation.z = 0.11 * Math.sin(TAU * u);
    g.rotation.x = 0.08 * Math.sin(TAU * u * 2);
    emblem.scale.setScalar(1 + 0.18 * pulse(u, 0.3, 0.65));
  });
};
builders.refresh = () => {
  const r = asset('refresh'),
    a = curvedArrow(r, 'cyan', 0.4, TAU - 0.45);
  a.rotation.z = 0.2;
  const h = symbol(
    a,
    [
      [-0.22, -0.24],
      [0.28, 0],
      [-0.22, 0.24],
    ],
    'gold',
    0.27,
    [Math.cos(TAU - 0.45) * 0.65, Math.sin(TAU - 0.45) * 0.65, 0.03],
    0.06,
  );
  h.rotation.z = TAU - 0.45 + Math.PI / 2;
  return finish(r, [a], 3.5, (u) => {
    a.rotation.z = 0.2 + TAU * (u - 0.1 * Math.sin(TAU * u));
  });
};
builders.settings = () => {
  const r = asset('settings'),
    gear = group(r, 'gear');
  const s = new T.Shape();
  for (let i = 0; i < 48; i++) {
    const a = (i * TAU) / 48,
      rad = [0.75, 0.75, 0.94, 0.94, 0.75, 0.75][i % 6];
    const p = [Math.cos(a) * rad, Math.sin(a) * rad];
    if (i === 0) s.moveTo(...p);
    else s.lineTo(...p);
  }
  s.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, 0.32, 0, TAU, true);
  s.holes.push(hole);
  extrude(gear, s, 0.24, 'gold', [0, 0, 0], 0.055);
  const cap = extrude(gear, s, 0.1, 'cream', [0, 0, 0.24], 0.025);
  cap.scale.set(0.94, 0.94, 1);
  const hub = ring(r, 0.32, 0.045, 'teal', [0, 0, 0.28]);
  return finish(r, [gear, hub], 4.8, (u) => {
    const step = u * 8,
      k = Math.floor(step),
      f = step - k;
    gear.rotation.z =
      ((k + (f < 0.45 ? 0 : f > 0.85 ? 1 : (f - 0.45) / 0.4)) * TAU) / 8;
    hub.rotation.z = -TAU * u;
    hub.position.z = 0.28 + 0.03 * Math.sin(TAU * u * 8);
  });
};
builders.lock = () => {
  const r = asset('lock');
  box(r, 1.32, 0.96, 0.49, 'cream', [0, -0.37, 0], 0.17);
  disc(r, 0.13, 0.04, 'teal', [0, -0.32, 0.28]);
  box(r, 0.1, 0.23, 0.06, 'teal', [0, -0.45, 0.29], 0.025);
  const shackle = group(r, 'shackle', [0.43, 0.03, 0]);
  tube(
    shackle,
    [
      [-0.86, 0, 0],
      [-0.86, 0.47, 0],
      [-0.68, 0.72, 0],
      [-0.18, 0.72, 0],
      [0, 0.47, 0],
      [0, 0, 0],
    ],
    0.12,
    'gold',
  );
  return finish(r, [shackle], 4.5, (u) => {
    const v = pulse(u, 0.08, 0.92);
    shackle.position.y = 0.03 + 0.25 * Math.min(1, v * 2);
    shackle.rotation.y = 1.2 * pulse(u, 0.25, 0.76);
  });
};
builders.play = () => {
  const r = asset('play'),
    g = group(r, 'triangle');
  symbol(
    g,
    [
      [-0.6, -0.82],
      [0.9, 0],
      [-0.6, 0.82],
    ],
    'gold',
    0.28,
  );
  const inset = symbol(
    g,
    [
      [-0.42, -0.57],
      [0.64, 0],
      [-0.42, 0.57],
    ],
    'cream',
    0.06,
    [0, 0, 0.3],
    0.04,
  );
  return finish(r, [g], 3.2, (u) => {
    const v = pulse(u, 0.18, 0.65);
    g.position.x = 0.16 * v;
    g.position.z = 0.18 * v;
    g.scale.set(1 + 0.04 * v, 1 - 0.04 * v, 1);
  });
};
builders.pause = () => {
  const r = asset('pause'),
    a = box(r, 0.43, 1.65, 0.34, 'gold', [-0.4, 0, 0]),
    b = box(r, 0.43, 1.65, 0.34, 'gold', [0.4, 0, 0]);
  return finish(r, [a, b], 3.6, (u) => {
    a.position.z = -0.18 * pulse(u, 0.12, 0.48);
    b.position.z = -0.18 * pulse(u, 0.31, 0.69);
    a.position.y = 0.06 * pulse(u, 0.12, 0.48);
    b.position.y = 0.06 * pulse(u, 0.31, 0.69);
  });
};
builders.close = () => {
  const r = asset('close'),
    a = group(r, 'arm_a'),
    b = group(r, 'arm_b');
  for (const g of [a, b]) {
    box(g, 0.39, 1.95, 0.22, 'gold');
    box(g, 0.27, 1.78, 0.1, 'cream', [0, 0, 0.16]);
  }
  a.rotation.z = Math.PI / 4;
  b.rotation.z = -Math.PI / 4;
  return finish(r, [a, b], 4, (u) => {
    const v = pulse(u, 0.2, 0.8);
    a.rotation.z = Math.PI / 4 + 0.18 * v;
    b.rotation.z = -Math.PI / 4 - 0.18 * v;
    a.position.z = 0.08 * v;
    b.position.z = -0.08 * v;
  });
};
builders.arrow = () => {
  const r = asset('arrow'),
    a = symbol(r, arrowPoints, 'gold', 0.27);
  return finish(r, [a], 3.8, (u) => {
    a.position.x = 0.22 * pulse(u, 0.1, 0.4) + 0.22 * pulse(u, 0.47, 0.77);
    a.scale.x = 1 + 0.08 * pulse(u, 0.1, 0.4);
  });
};
builders.robot = () => {
  const r = asset('robot'),
    head = group(r, 'head');
  ball(head, 0.85, 'cream', [0, 0, 0], [1, 0.78, 0.63]);
  box(head, 1.2, 0.7, 0.22, 'gold', [0, -0.03, 0.39], 0.17);
  box(head, 1.04, 0.54, 0.18, 'teal', [0, -0.03, 0.51], 0.16);
  const eyes = [-0.27, 0.27].map((x) =>
    box(head, 0.14, 0.3, 0.08, 'glass', [x, -0.02, 0.63], 0.06),
  );
  for (const x of [-0.85, 0.85]) {
    const e = port(head, 0.18, [x, 0, 0]);
    e.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  const antenna = group(head, 'antenna', [0, 0.64, 0]);
  cyl(antenna, 0.06, 0.22, 'teal', [0, 0.1, 0]);
  ball(antenna, 0.14, 'gold', [0, 0.29, 0]);
  return finish(r, [head, ...eyes, antenna], 5.8, (u) => {
    head.rotation.y = 0.24 * Math.sin(TAU * u);
    head.rotation.z = 0.06 * Math.sin(TAU * u * 2);
    eyes.forEach(
      (e, i) =>
        (e.scale.y = 1 - 0.92 * pulse(u, 0.34 + i * 0.015, 0.4 + i * 0.015)),
    );
    antenna.rotation.z = 0.15 * Math.sin(TAU * u * 3);
  });
};
builders.cloud = () => {
  const r = asset('cloud'),
    a = group(r, 'cloud_left'),
    b = group(r, 'cloud_right');
  ball(a, 0.5, 'cream', [-0.52, -0.12, 0], [1, 1, 0.5]);
  ball(a, 0.62, 'cream', [-0.15, 0.2, 0], [1, 1, 0.5]);
  ball(b, 0.51, 'cream', [0.5, -0.1, 0], [1, 1, 0.5]);
  box(r, 1.24, 0.4, 0.36, 'cream', [0, -0.33, 0], 0.15);
  const ar = symbol(r, arrowPoints, 'cyan', 0.2, [0, -0.12, 0.45], 0.04);
  ar.rotation.z = Math.PI / 2;
  ar.scale.setScalar(0.72);
  return finish(r, [a, b, ar], 4.4, (u) => {
    const v = pulse(u, 0.08, 0.92);
    ar.position.y = -0.3 + 0.55 * v;
    a.position.x = -0.05 * v;
    b.position.x = 0.07 * v;
    a.rotation.z = 0.025 * Math.sin(TAU * u);
  });
};
builders.check = () => {
  const r = asset('check'),
    a = group(r, 'short_arm', [-0.2, -0.42, 0]),
    b = group(r, 'long_arm', [-0.2, -0.42, 0]);
  for (const [g, h] of [
    [a, 0.68],
    [b, 1.36],
  ]) {
    box(g, 0.33, h, 0.24, 'gold', [0, h / 2, 0], 0.09);
    box(g, 0.23, h - 0.08, 0.1, 'cyan', [0, h / 2, 0.17], 0.055);
  }
  a.rotation.z = Math.PI / 4;
  b.rotation.z = -Math.PI / 4;
  return finish(r, [a, b], 4.1, (u) => {
    a.rotation.z = Math.PI / 4 + 0.18 * pulse(u, 0.1, 0.55);
    b.rotation.z = -Math.PI / 4 - 0.4 * pulse(u, 0.22, 0.82);
    b.position.z = 0.09 * pulse(u, 0.3, 0.7);
  });
};
builders.depth = () => {
  const r = asset('depth'),
    a = symbol(r, arrowPoints, 'gold', 0.25, [-0.2, 0, 0]);
  a.rotation.z = -Math.PI / 2;
  a.scale.set(0.9, 0.8, 1);
  const ticks = [0.5, 0, -0.5].map((y) =>
    box(r, 0.4, 0.15, 0.18, 'cyan', [0.68, y, 0]),
  );
  return finish(r, [a, ...ticks], 4.8, (u) => {
    a.position.y = 0.22 * Math.cos(TAU * u);
    ticks.forEach((e, i) => {
      e.position.z = 0.12 * pulse(u, 0.08 + i * 0.18, 0.36 + i * 0.18);
    });
  });
};
builders.profile = () => {
  const r = asset('profile');
  cyl(r, 0.59, 0.2, 'teal', [0, -0.8, 0]);
  const helmet = group(r, 'helmet');
  ball(helmet, 0.77, 'cream', [0, -0.04, 0], [1, 1.05, 0.85]);
  port(helmet, 0.42, [0, -0.02, 0.55]);
  cyl(helmet, 0.26, 0.12, 'gold', [0, 0.79, 0]);
  cyl(helmet, 0.18, 0.1, 'cream', [0, 0.9, 0]);
  const valve = group(helmet, 'side_valve', [0.72, 0, 0]);
  valve.rotation.y = Math.PI / 2;
  disc(valve, 0.29, 0.12, 'gold');
  disc(valve, 0.22, 0.16, 'teal');
  for (const y of [-0.1, 0, 0.1])
    box(valve, 0.3, 0.035, 0.04, 'silver', [0, y, 0.1], 0.01);
  return finish(r, [helmet, valve], 5.6, (u) => {
    helmet.rotation.y = 0.2 * Math.sin(TAU * u);
    valve.rotation.z = TAU * u;
  });
};
builders.camera = () => {
  const r = asset('camera');
  box(r, 1.65, 1.12, 0.66, 'cream', [0, 0, 0], 0.18);
  box(r, 1.65, 0.23, 0.7, 'teal', [0, -0.5, 0]);
  const lens = group(r, 'lens', [0.12, 0, 0.4]);
  port(lens, 0.43, [0, 0, 0]);
  const bezel = ring(lens, 0.39, 0.025, 'silver', [0, 0, 0.16]);
  const button = cyl(r, 0.13, 0.15, 'gold', [-0.48, 0.65, 0]);
  box(r, 0.29, 0.21, 0.07, 'teal', [-0.55, 0.23, 0.36]);
  box(r, 0.19, 0.12, 0.07, 'glass', [-0.55, 0.23, 0.4]);
  return finish(r, [lens, bezel, button], 4.5, (u) => {
    lens.position.z = 0.4 + 0.17 * pulse(u, 0.08, 0.8);
    bezel.rotation.z = 0.6 * Math.sin(TAU * u);
    button.position.y = 0.65 - 0.08 * pulse(u, 0.44, 0.63);
  });
};
builders.trash = () => {
  const r = asset('trash'),
    body = group(r, 'bin');
  box(body, 1.13, 1.36, 0.85, 'cream', [0, -0.08, 0], 0.13);
  box(body, 1.17, 0.17, 0.89, 'teal', [0, -0.77, 0]);
  for (const x of [-0.27, 0.27])
    box(body, 0.105, 0.68, 0.04, 'cyan', [x, -0.05, 0.45], 0.04);
  const lid = group(body, 'hinge', [0, 0.65, -0.43]);
  box(lid, 1.27, 0.25, 0.99, 'gold', [0, 0, 0.43], 0.1);
  box(lid, 0.6, 0.12, 0.3, 'edge', [0, 0.18, 0.4]);
  return finish(r, [body, lid], 5, (u) => {
    lid.rotation.x = -1.15 * pulse(u, 0.1, 0.86);
    body.rotation.z = 0.045 * Math.sin(TAU * u * 5) * pulse(u, 0.5, 0.9);
  });
};
builders.cookie = () => {
  const r = asset('cookie'),
    g = group(r, 'cookie');
  const R = 0.9,
    br = 0.38,
    bx = 0.78,
    by = 0.51,
    d = Math.hypot(bx, by),
    a = Math.atan2(by, bx),
    da = Math.acos((R * R + d * d - br * br) / (2 * R * d));
  const hi = a + da,
    lo = a - da,
    s = new T.Shape();
  s.absarc(0, 0, R, hi, lo + TAU, false);
  const low = [R * Math.cos(lo), R * Math.sin(lo)],
    high = [R * Math.cos(hi), R * Math.sin(hi)];
  const ba = Math.atan2(low[1] - by, low[0] - bx),
    bb = Math.atan2(high[1] - by, high[0] - bx);
  s.absarc(bx, by, br, ba, bb, true);
  s.closePath();
  extrude(g, s, 0.22, 'gold', [0, 0, 0], 0.045);
  const chips = [
    [-0.4, 0.35],
    [0.02, 0.48],
    [-0.38, -0.32],
    [0.2, -0.37],
  ].map(([x, y]) => {
    const o = mesh(g, new T.DodecahedronGeometry(0.12, 0), 'teal', [
      x,
      y,
      0.27,
    ]);
    o.scale.z = 0.4;
    return o;
  });
  return finish(r, [g, ...chips], 5.2, (u) => {
    g.rotation.z = 0.09 * Math.sin(TAU * u);
    g.rotation.x = 0.09 * Math.sin(TAU * u * 2);
    chips.forEach(
      (c, i) =>
        (c.position.z =
          0.27 - 0.055 * pulse(u, 0.08 + i * 0.16, 0.28 + i * 0.16)),
    );
  });
};
builders.database = () => {
  const r = asset('database'),
    stacks = [],
    lights = [];
  for (let i = 0; i < 3; i++) {
    const g = group(r, `disc_${i}`, [0, -0.59 + i * 0.59, 0]);
    cyl(g, 0.72, 0.49, 'cream');
    cyl(g, 0.73, 0.09, 'teal', [0, -0.21, 0]);
    box(g, 0.27, 0.1, 0.08, 'teal', [0.23, 0, 0.67], 0.035);
    lights.push(box(g, 0.17, 0.045, 0.07, 'glass', [0.23, 0, 0.72], 0.015));
    stacks.push(g);
  }
  return finish(r, [...stacks, ...lights], 5.2, (u) => {
    const v = pulse(u, 0.1, 0.9);
    stacks.forEach(
      (s, i) => (s.position.y = -0.59 + i * 0.59 + (i - 1) * 0.16 * v),
    );
    lights.forEach(
      (s, i) =>
        (s.scale.x = 1 + 0.5 * pulse(u, 0.1 + i * 0.19, 0.36 + i * 0.19)),
    );
  });
};
builders.analytics = () => {
  const r = asset('analytics');
  box(r, 1.9, 0.18, 0.65, 'teal', [0, -0.87, 0]);
  const bars = [];
  for (const [i, h, mat] of [
    [0, 0.65, 'cyan'],
    [1, 1.1, 'cream'],
    [2, 1.65, 'gold'],
  ]) {
    const g = group(r, `bar_${i}`, [-0.6 + i * 0.6, -0.78, 0]);
    box(g, 0.43, h, 0.44, mat, [0, h / 2, 0]);
    bars.push(g);
  }
  return finish(r, bars, 5, (u) => {
    bars.forEach((b, i) => {
      const v = pulse(u, 0.05 + i * 0.1, 0.8 + i * 0.08);
      b.scale.y = 0.55 + 0.45 * v;
    });
  });
};
builders.logout = () => {
  const r = asset('logout');
  for (const x of [-0.68, 0.68]) box(r, 0.21, 1.75, 0.4, 'teal', [x, 0, 0]);
  box(r, 1.5, 0.21, 0.4, 'teal', [0, 0.84, 0]);
  const door = group(r, 'door_hinge', [-0.55, 0, -0.08]);
  box(door, 1.1, 1.5, 0.13, 'cyan', [0.55, 0, 0]);
  const a = symbol(r, arrowPoints, 'gold', 0.27, [0.2, -0.05, 0.38]);
  a.scale.setScalar(0.72);
  return finish(r, [door, a], 5.2, (u) => {
    door.rotation.y = -1.3 * pulse(u, 0.06, 0.94);
    a.position.x = 0.2 + 0.4 * pulse(u, 0.23, 0.79);
    a.position.z = 0.38 + 0.12 * pulse(u, 0.23, 0.79);
  });
};
builders['resource-gold'] = () => {
  const r = asset('resource-gold'),
    g = group(r, 'ingot');
  const sh = polygon([
    [-0.92, -0.34],
    [0.92, -0.34],
    [0.7, 0.3],
    [-0.7, 0.3],
  ]);
  extrude(g, sh, 1.04, 'gold', [0, 0, -0.52], 0.06);
  g.rotation.x = -0.23;
  return finish(r, [g], 5.5, (u) => {
    g.rotation.z = 0.13 * Math.sin(TAU * u);
    g.rotation.x = -0.23 + 0.2 * Math.sin(TAU * u * 2);
    g.position.y = 0.03 * (1 - Math.cos(TAU * u * 2));
  });
};
builders['resource-pearl'] = () => {
  const r = asset('resource-pearl'),
    g = group(r, 'pearl');
  // Vertex colors keep the restrained pearlescent color in the exported GLB.
  const geo = new T.SphereGeometry(0.83, 48, 32),
    colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const c = new T.Color('#e7d9ee');
    c.lerp(
      new T.Color('#a6a4d7'),
      Math.max(0, Math.sin(pos.getX(i) * 3 + pos.getY(i) * 2) * 0.45),
    );
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  mesh(
    g,
    geo,
    new T.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.27,
    }),
  );
  return finish(r, [g], 6.4, (u) => {
    g.rotation.z = 0.18 * Math.sin(TAU * u);
    g.rotation.y = 0.7 * Math.sin(TAU * u);
    g.position.x = 0.08 * Math.sin(TAU * u);
    g.position.y = 0.025 * (1 - Math.cos(TAU * u * 2));
  });
};
builders['resource-alloy'] = () => {
  const r = asset('resource-alloy');
  box(r, 1.07, 1.07, 1.07, 'coral');
  const plates = [];
  for (const [axis, sign] of [
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [2, 1],
    [2, -1],
  ]) {
    const p = group(r, 'armor');
    const dims = [1.23, 1.23, 1.23];
    dims[axis] = 0.13;
    const a = box(p, ...dims, 'teal');
    const pos = [0, 0, 0];
    pos[axis] = sign * 0.63;
    p.position.set(...pos);
    p.userData.axis = axis;
    p.userData.sign = sign;
    const dim2 = [0.99, 0.99, 0.99];
    dim2[axis] = 0.08;
    const offset = [0, 0, 0];
    offset[axis] = sign * 0.08;
    box(p, ...dim2, 'coral', offset);
    plates.push(p);
  }
  return finish(r, plates, 5.6, (u) => {
    plates.forEach((p, i) => {
      const a = ['x', 'y', 'z'][p.userData.axis];
      p.position[a] =
        p.userData.sign *
        (0.63 + 0.15 * pulse(u, 0.1 + i * 0.025, 0.77 + i * 0.025));
    });
  });
};
builders['resource-core'] = () => {
  const r = asset('resource-core');
  cyl(r, 0.83, 0.4, 'teal', [0, -0.2, 0], 0.83, 6);
  cyl(r, 0.68, 0.1, 'silver', [0, 0.05, 0], 0.68, 6);
  const lens = ball(r, 0.49, 'glass', [0, 0.12, 0], [1, 0.6, 1]);
  const clamps = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    const p = group(r, 'clamp', [Math.cos(a) * 0.6, 0.13, Math.sin(a) * 0.6]);
    p.rotation.y = -a;
    box(p, 0.23, 0.19, 0.43, 'gold');
    p.userData.angle = a;
    clamps.push(p);
  }
  return finish(r, [lens, ...clamps], 4.8, (u) => {
    const v = pulse(u, 0.12, 0.88);
    lens.scale.set(1 + 0.12 * v, 0.6 + 0.15 * v, 1 + 0.12 * v);
    clamps.forEach((p) => {
      const a = p.userData.angle;
      p.position.x = Math.cos(a) * (0.6 + 0.15 * v);
      p.position.z = Math.sin(a) * (0.6 + 0.15 * v);
    });
  });
};
builders.email = () => {
  const r = asset('email');
  box(r, 1.8, 1.2, 0.23, 'teal');
  box(r, 1.64, 1.07, 0.25, 'cream', [0, 0, 0.04]);
  const letter = box(r, 1.37, 0.87, 0.06, 'cream', [0, 0, 0.09]);
  const flap = group(r, 'flap', [0, 0.55, 0.21]);
  symbol(
    flap,
    [
      [-0.83, 0],
      [0.83, 0],
      [0, -0.73],
    ],
    'gold',
    0.08,
    [0, 0, 0],
    0.035,
  );
  const seal = disc(flap, 0.17, 0.05, 'edge', [0, -0.45, 0.13]);
  tube(
    r,
    [
      [-0.82, -0.5, 0.21],
      [0, 0.04, 0.24],
      [0.82, -0.5, 0.21],
    ],
    0.028,
    'teal',
  );
  return finish(r, [flap, letter], 5.4, (u) => {
    const v = pulse(u, 0.1, 0.9);
    flap.rotation.x = -2.65 * v;
    letter.position.y = 0.38 * pulse(u, 0.25, 0.79);
  });
};
function token(p, color = 'gold', inner = 'cream') {
  disc(p, 0.91, 0.2, color);
  disc(p, 0.78, 0.23, inner);
  ring(p, 0.81, 0.035, 'cream', [0, 0, 0.15]);
}
builders['provider-google'] = () => {
  const r = asset('provider-google');
  const paths = new DOMParser()
    .parseFromString(providerSources['provider-google'], 'image/svg+xml')
    .querySelector('path')
    .getAttribute('d');
  const pieces = paths.match(/[Mm][^Mm]*/g),
    colors = ['#4285f4', '#34a853', '#fbbc05', '#ea4335'];
  const groups = [];
  pieces.forEach((d, i) => {
    const g = group(r, `segment_${i}`);
    svgRelief(
      g,
      svgShapes(
        `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`,
      ),
      material(colors[i]),
      0.086,
      0,
    );
    groups.push(g);
  });
  return finish(r, groups, 5.6, (u) => {
    groups.forEach((g, i) => {
      const a = [-0.3, -1.9, -3.2, 1.8][i],
        v = pulse(u, 0.06 + i * 0.035, 0.79 + i * 0.035);
      g.position.x = Math.cos(a) * 0.14 * v;
      g.position.y = Math.sin(a) * 0.14 * v;
      g.position.z = 0.05 * v;
    });
  });
};
builders['provider-facebook'] = () => {
  const r = asset('provider-facebook');
  box(r, 1.7, 1.8, 0.33, material('#427ad0'), [0, 0, 0], 0.22);
  const f = symbol(
    r,
    [
      [-0.03, -0.73],
      [0.31, -0.73],
      [0.31, 0.03],
      [0.57, 0.03],
      [0.61, 0.36],
      [0.31, 0.36],
      [0.31, 0.52],
      [0.4, 0.61],
      [0.61, 0.61],
      [0.61, 0.93],
      [0.32, 0.93],
      [0.08, 0.86],
      [-0.03, 0.62],
      [-0.03, 0.36],
      [-0.25, 0.36],
      [-0.25, 0.03],
      [-0.03, 0.03],
    ],
    'cream',
    0.14,
    [-0.12, -0.05, 0.23],
    0.025,
  );
  return finish(r, [f], 4.8, (u) => {
    f.position.z = 0.23 + 0.16 * pulse(u, 0.12, 0.82);
    f.rotation.z = 0.045 * Math.sin(TAU * u);
  });
};
builders['provider-discord'] = () => {
  const r = asset('provider-discord'),
    g = group(r, 'mascot');
  svgRelief(
    g,
    svgShapes(providerSources['provider-discord']),
    material('#8d88eb'),
    0.077,
    0,
  );
  const eyes = [-0.31, 0.31].map((x) =>
    ball(g, 0.11, material('#474d9c'), [x, -0.04, 0.09], [1, 1, 0.4]),
  );
  return finish(r, [g, ...eyes], 5.3, (u) => {
    g.rotation.z = 0.075 * Math.sin(TAU * u);
    g.rotation.x = 0.08 * pulse(u, 0.14, 0.72);
    eyes.forEach(
      (e, i) =>
        (e.scale.y = 1 - 0.87 * pulse(u, 0.3 + i * 0.15, 0.39 + i * 0.15)),
    );
  });
};
builders['provider-github'] = () => {
  const r = asset('provider-github');
  token(r);
  const cat = group(r, 'octocat', [0, 0.04, 0.21]);
  ball(cat, 0.42, 'teal', [0, 0.16, 0], [1.12, 0.83, 0.2]);
  ball(cat, 0.22, 'teal', [0, -0.31, 0], [1, 0.95, 0.3]);
  const ears = [];
  for (const x of [-1, 1]) {
    const ear = group(cat, 'ear', [x * 0.3, 0.36, 0]);
    symbol(
      ear,
      [
        [-0.13, 0],
        [0.13, 0],
        [x * 0.12, 0.28],
      ],
      'teal',
      0.08,
      [0, 0, -0.03],
      0.02,
    );
    ears.push(ear);
  }
  for (const x of [-0.12, 0.12])
    box(cat, 0.1, 0.25, 0.08, 'teal', [x, -0.49, 0]);
  const tail = group(cat, 'tail', [-0.18, -0.31, 0]);
  tube(
    tail,
    [
      [0, 0, 0],
      [-0.18, -0.03, 0],
      [-0.31, 0.02, 0],
      [-0.4, 0.16, 0],
    ],
    0.052,
    'teal',
  );
  return finish(r, [tail, ...ears], 5.9, (u) => {
    tail.rotation.z = 0.27 * Math.sin(TAU * u * 2);
    ears.forEach(
      (e, i) =>
        (e.rotation.z =
          (i ? 1 : -1) * 0.09 * pulse(u, 0.15 + i * 0.18, 0.48 + i * 0.18)),
    );
  });
};
builders['provider-twitch'] = () => {
  const r = asset('provider-twitch'),
    g = group(r, 'chat');
  symbol(
    g,
    [
      [-0.85, 0.85],
      [0.84, 0.85],
      [0.84, -0.33],
      [0.34, -0.82],
      [-0.12, -0.82],
      [-0.48, -1.12],
      [-0.48, -0.82],
      [-0.85, -0.82],
    ],
    material('#8457c8'),
    0.24,
    [0, 0.05, 0],
    0.025,
  );
  symbol(
    g,
    [
      [-0.58, 0.61],
      [0.58, 0.61],
      [0.58, -0.22],
      [0.24, -0.55],
      [-0.14, -0.55],
      [-0.38, -0.76],
      [-0.38, -0.55],
      [-0.58, -0.55],
    ],
    'cream',
    0.08,
    [0, 0.05, 0.26],
    0.015,
  );
  const eyes = [-0.16, 0.29].map((x) =>
    box(g, 0.15, 0.5, 0.08, material('#8457c8'), [x, 0.13, 0.39], 0.018),
  );
  return finish(r, [g, ...eyes], 4.6, (u) => {
    g.scale.set(
      1 + 0.025 * Math.sin(TAU * u),
      1 - 0.025 * Math.sin(TAU * u),
      1,
    );
    eyes.forEach(
      (e, i) =>
        (e.position.y =
          0.13 + 0.11 * pulse(u, 0.12 + i * 0.24, 0.35 + i * 0.24)),
    );
  });
};
builders['provider-x'] = () => {
  const r = asset('provider-x');
  token(r, 'gold', 'teal');
  const a = group(r, 'diagonal_a', [0, 0, 0.24]),
    b = group(r, 'diagonal_b', [0, 0, 0.26]);
  symbol(
    a,
    [
      [-0.62, 0.72],
      [-0.29, 0.72],
      [0.63, -0.72],
      [0.3, -0.72],
    ],
    'cream',
    0.09,
    [0, 0, 0],
    0.012,
  );
  symbol(
    b,
    [
      [0.47, 0.72],
      [0.62, 0.72],
      [-0.5, -0.72],
      [-0.64, -0.72],
    ],
    'cream',
    0.09,
    [0, 0, 0],
    0.012,
  );
  return finish(r, [a, b], 5.1, (u) => {
    const v = pulse(u, 0.15, 0.85);
    a.rotation.y = 0.21 * v;
    b.rotation.y = -0.21 * v;
    a.rotation.z = 0.05 * v;
    b.rotation.z = -0.05 * v;
  });
};
builders['provider-telegram'] = () => {
  const r = asset('provider-telegram');
  token(r, 'cyan', 'cyan');
  const plane = group(r, 'plane', [0, 0, 0.26]);
  symbol(
    plane,
    [
      [-0.66, 0.08],
      [0.68, 0.65],
      [0.37, -0.58],
      [0.02, -0.3],
      [-0.22, -0.5],
      [-0.18, -0.18],
    ],
    'cream',
    0.08,
    [0, 0, 0],
    0.02,
  );
  symbol(
    plane,
    [
      [-0.18, -0.18],
      [0.68, 0.65],
      [0.02, -0.3],
      [-0.22, -0.5],
    ],
    'silver',
    0.05,
    [0, 0, 0.085],
    0.01,
  );
  return finish(r, [plane], 5.7, (u) => {
    const v = pulse(u, 0.09, 0.91);
    plane.position.x = 0.19 * Math.sin(TAU * u) * v;
    plane.position.y = 0.2 * v;
    plane.position.z = 0.26 + 0.35 * v;
    plane.rotation.y = -0.23 * Math.sin(TAU * u);
    plane.rotation.z = 0.1 * Math.sin(TAU * u);
  });
};
builders['provider-steam'] = () => {
  const r = asset('provider-steam');
  token(r, 'cream', 'teal');
  const crank = group(r, 'connecting_rod', [0.37, 0.31, 0.23]);
  ring(crank, 0.22, 0.075, 'cream');
  disc(crank, 0.1, 0.08, 'cream', [0, 0, 0.02]);
  const arm = symbol(
    crank,
    [
      [-0.16, -0.09],
      [-0.72, -0.59],
      [-0.58, -0.74],
      [0.1, -0.18],
    ],
    'cream',
    0.1,
    [0, 0, 0],
    0.025,
  );
  ring(crank, 0.19, 0.065, 'cream', [-0.65, -0.65, 0]);
  tube(
    crank,
    [
      [-0.68, -0.65, 0],
      [-0.94, -0.49, 0],
      [-1.04, -0.43, 0],
    ],
    0.065,
    'cream',
  );
  return finish(r, [crank], 6.3, (u) => {
    crank.rotation.z = 0.19 * Math.sin(TAU * u);
  });
};
builders['provider-linkedin'] = () => {
  const r = asset('provider-linkedin');
  box(r, 1.8, 1.8, 0.3, material('#3b8aaa'), [0, 0, 0], 0.18);
  box(r, 1.58, 1.58, 0.07, material('#347997'), [0, 0, 0.2], 0.13);
  box(r, 0.23, 0.82, 0.12, 'cream', [-0.46, -0.15, 0.29], 0.035);
  const dot = disc(r, 0.135, 0.14, 'cream', [-0.46, 0.51, 0.3]);
  const n = group(r, 'letter_n', [0.11, -0.15, 0.3]);
  box(n, 0.22, 0.82, 0.13, 'cream', [-0.12, 0, 0], 0.025);
  box(n, 0.22, 0.7, 0.13, 'cream', [0.35, -0.06, 0], 0.025);
  tube(
    n,
    [
      [-0.1, 0.21, 0],
      [0.05, 0.35, 0],
      [0.24, 0.35, 0],
      [0.34, 0.2, 0],
    ],
    0.105,
    'cream',
  );
  return finish(r, [dot, n], 4.9, (u) => {
    dot.position.y = 0.51 + 0.2 * pulse(u, 0.15, 0.5);
    n.rotation.z = 0.045 * pulse(u, 0.35, 0.8);
  });
};
builders['provider-microsoft'] = () => {
  const r = asset('provider-microsoft'),
    tiles = [];
  for (const [i, x, y, c] of [
    [0, -0.48, 0.48, '#ef7058'],
    [1, 0.48, 0.48, '#91bd45'],
    [2, -0.48, -0.48, '#54a0d6'],
    [3, 0.48, -0.48, '#f7c44d'],
  ]) {
    const g = group(r, `tile_${i}`, [x, y, 0]);
    box(g, 0.83, 0.83, 0.24, material(c), [0, 0, 0], 0.09);
    tiles.push(g);
  }
  return finish(r, tiles, 5.8, (u) => {
    tiles.forEach((t, i) => {
      const v = pulse(u, 0.04 + i * 0.1, 0.62 + i * 0.1);
      t.rotation.y = (i % 2 ? 1 : -1) * 0.43 * v;
      t.position.z = 0.13 * v;
    });
  });
};

export function createAsset(id) {
  if (!builders[id]) throw Error(`Unknown asset: ${id}`);
  const a = builders[id]();
  a.root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(a.root),
    size = bounds.getSize(new T.Vector3());
  const center = bounds.getCenter(new T.Vector3());
  const outer = new T.Group();
  outer.name = `${id}_display`;
  outer.add(a.root);
  // Center via the display parent only. Exported root/animation coordinates stay untouched.
  a.root.position.sub(center); // Root is never an animated node; moving it centers both clip and geometry.
  a.root.updateMatrixWorld(true);
  a.radius = Math.max(size.x, size.y, size.z) * 0.5;
  a.size = size;
  a.id = id;
  a.root.userData.motion = catalog.find((c) => c.id === id).motion;
  return a;
}
