"""
Fake-data generator for the 26-SAP-D-MSR portfolio demo build.

Produces the 6 SQLite databases (sales.db, receivables.db, pnl.db, hr.db,
targets.db, inventory.db) with a schema IDENTICAL to the real production
databases (etl/output/*.db) but with 100% fictional/synthetic content.

Usage:
    python generate.py

Requires: Python 3.11+, stdlib only, plus the `jdatetime` package
(pip install jdatetime) for accurate Jalali (Persian solar) calendar dates.

Deterministic: uses a fixed random seed so re-running produces the same
data (useful for resetting the demo's "data freshness" banner - re-run
this script any time to regenerate all 6 databases with dates anchored to
"today").

NOTE ON TERMINAL OUTPUT: this script deliberately avoids printing Persian
text to stdout (Windows terminal codepages can choke on it) - progress
messages are English-only; a UTF-8 summary log is written to
generate_summary.log instead.
"""

import random
import sqlite3
import os
import io
import sys
import jdatetime

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

SEED = 42
random.seed(SEED)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)

TODAY = jdatetime.date.today()
MONTH_NAMES_FA = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

MONTHLY_INFLATION = 0.035  # ~3.5%/month nominal price drift used for sales price history

summary_lines = []


def log(msg: str):
    summary_lines.append(msg)


def is_leap_jyear(y: int) -> bool:
    return jdatetime.date(y, 1, 1).isleap()


def days_in_month(y: int, m: int) -> int:
    d = jdatetime.j_days_in_month[m - 1]
    if m == 12 and is_leap_jyear(y):
        d = 30
    return d


def add_months(y: int, m: int, delta: int):
    total = (y * 12 + (m - 1)) + delta
    ny, nm = divmod(total, 12)
    return ny, nm + 1


def jstr(y: int, m: int, d: int) -> str:
    return f"{y}/{m:02d}/{d:02d}"


def jdn(y: int, m: int, d: int) -> int:
    """Julian-day-number-like integer for date arithmetic (via jdatetime.toordinal)."""
    return jdatetime.date(y, m, d).toordinal()


TODAY_STR = jstr(TODAY.year, TODAY.month, TODAY.day)
TODAY_JDN = jdn(TODAY.year, TODAY.month, TODAY.day)

log(f"Today (Jalali): {TODAY_STR}")

# --------------------------------------------------------------------------
# Shared reference pools
# --------------------------------------------------------------------------

PROVINCES = [
    "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام",
    "بوشهر", "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی",
    "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس",
    "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد",
    "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد",
]

SALES_CENTERS_CORE = [
    "مرکز فعالیت اینترنتی",
    "مرکز فعالیت تهران",
    "مرکز فعالیت خراسان",
    "مرکز فعالیت صادراتی",
    "مرکز فعالیت مرکزی",
    "مرکز فعالیت مشهد خرده فروشی1",
    "مرکز فعالیت مشهد زنجیره ای",
    "مرکز فعالیت مصلی",
    "مرکز فعالیت مهر ثمین",
    "مرکز فعالیت مویرگی اصفهان",
    "مرکز فعالیت مویرگی تهران",
    "مرکز فعالیت مویرگی رشت",
    "مرکز فعالیت مویرگی قزوین",
    "مرکز فعالیت نمایندگی",
]
SALES_CENTERS_EXTRA_PNL = [
    "مرکز فعالیت باب الجواد",
    "مرکز فعالیت خراسان جنوبی",
    "مرکز فعالیت خراسان شمالی",
]
ALL_PNL_CENTERS = SALES_CENTERS_CORE + SALES_CENTERS_EXTRA_PNL

BRANCHES = ["اصفهان", "خراسان", "خرده فروشی", "رشت", "زنجیره‌ای", "قزوین", "مصلی"]
BRANCH_TO_SALES_CENTER = {
    "اصفهان": "مرکز فعالیت مویرگی اصفهان",
    "خراسان": "مرکز فعالیت خراسان",
    "خرده فروشی": "مرکز فعالیت مشهد خرده فروشی1",
    "رشت": "مرکز فعالیت مویرگی رشت",
    "زنجیره‌ای": "مرکز فعالیت مشهد زنجیره ای",
    "قزوین": "مرکز فعالیت مویرگی قزوین",
    "مصلی": "مرکز فعالیت مصلی",
}
BRANCH_TO_REGIONS = {
    "اصفهان": ["اصفهان"],
    "خراسان": ["خراسان شمالی", "خراسان جنوبی"],
    "خرده فروشی": ["خرده فروشی (مشهد)"],
    "رشت": ["رشت"],
    "زنجیره‌ای": ["زنجیره‌ای (مشهد)"],
    "قزوین": ["قزوین"],
    "مصلی": ["مصلی (مشهد)"],
}
BRANCH_TO_PROVINCE = {
    "اصفهان": "اصفهان",
    "خراسان": "خراسان رضوی",
    "خرده فروشی": "خراسان رضوی",
    "رشت": "گیلان",
    "زنجیره‌ای": "خراسان رضوی",
    "قزوین": "قزوین",
    "مصلی": "خراسان رضوی",
}

ITEM_GROUPS = [
    "چای خارجه", "چای داخله", "چای فله خارجه", "چای کله مورچه", "تیبگ",
    "دمنوش", "دمنوش تیشاپ", "زعفران", "حبوبات", "غلات", "ادویه", "نبات",
    "مربا", "کاسترد", "پودر ژله", "پودر کیک", "کنسرو باختر", "کنسرو کمپوت",
    "نوشیدنی گیاهی", "بهداشتی", "ترشیجات", "آردیجات و سوخاری", "ماسالاتی",
    "کافی قهوه کاکائو", "هالیدی", "جت کلین", "سایر",
]

# unit_family + price range (Rial per "natural" unit: per piece/box for count, per kg for weight) per group
GROUP_META = {
    "چای خارجه": ("count", 250_000, 900_000),
    "چای داخله": ("count", 150_000, 600_000),
    "چای فله خارجه": ("weight", 900_000, 2_600_000),
    "چای کله مورچه": ("count", 200_000, 700_000),
    "تیبگ": ("count", 90_000, 320_000),
    "دمنوش": ("count", 100_000, 400_000),
    "دمنوش تیشاپ": ("count", 120_000, 450_000),
    "زعفران": ("weight", 180_000_000, 320_000_000),
    "حبوبات": ("weight", 90_000, 260_000),
    "غلات": ("weight", 70_000, 220_000),
    "ادویه": ("weight", 220_000, 950_000),
    "نبات": ("count", 90_000, 300_000),
    "مربا": ("count", 110_000, 380_000),
    "کاسترد": ("count", 100_000, 350_000),
    "پودر ژله": ("count", 60_000, 220_000),
    "پودر کیک": ("count", 90_000, 320_000),
    "کنسرو باختر": ("count", 130_000, 420_000),
    "کنسرو کمپوت": ("count", 140_000, 450_000),
    "نوشیدنی گیاهی": ("count", 80_000, 280_000),
    "بهداشتی": ("count", 60_000, 350_000),
    "ترشیجات": ("count", 100_000, 340_000),
    "آردیجات و سوخاری": ("count", 90_000, 310_000),
    "ماسالاتی": ("count", 70_000, 260_000),
    "کافی قهوه کاکائو": ("count", 180_000, 700_000),
    "هالیدی": ("count", 120_000, 500_000),
    "جت کلین": ("count", 70_000, 260_000),
    "سایر": ("count", 80_000, 300_000),
}

GROUP_STEMS = {
    "چای خارجه": ["چای سیلان ممتاز", "چای سریلانکا کلاسیک", "چای سیلان طلایی", "چای خارجی ویژه", "چای سیلان اکسترا"],
    "چای داخله": ["چای لاهیجان ممتاز", "چای ایرانی سنتی", "چای شمال اعلا", "چای داخلی ویژه", "چای قلم ایرانی"],
    "چای فله خارجه": ["چای فله سیلان", "چای فله هندی", "چای فله کنیا", "چای فله ممتاز صادراتی"],
    "چای کله مورچه": ["چای کله مورچه اعلا", "چای کله مورچه ویژه", "چای کله مورچه ممتاز"],
    "تیبگ": ["تی بگ کلاسیک", "تی بگ ارل گری", "تی بگ هل دار", "تی بگ نعنا", "تی بگ ترش", "تی بگ بابونه"],
    "دمنوش": ["دمنوش گل گاوزبان", "دمنوش زعفران", "دمنوش زنجبیل و لیمو", "دمنوش آویشن", "دمنوش هشت گیاه"],
    "دمنوش تیشاپ": ["دمنوش تی‌شاپ سیب دارچین", "دمنوش تی‌شاپ توت قرمز", "دمنوش تی‌شاپ نعنا لیمو", "دمنوش تی‌شاپ هل و زعفران"],
    "زعفران": ["زعفران سرگل ممتاز", "زعفران نگین اعلا", "زعفران پوشال ویژه"],
    "حبوبات": ["عدس درجه یک", "لوبیا چیتی ممتاز", "نخود ممتاز", "لپه اعلا", "لوبیا قرمز درجه یک"],
    "غلات": ["برنج طارم اعلا", "برنج هاشمی ممتاز", "جو پرک", "گندم پوست‌کنده"],
    "ادویه": ["زردچوبه ممتاز", "فلفل سیاه دانه", "دارچین چوبی", "زیره سبز", "هل سبز اعلا"],
    "نبات": ["نبات زعفرانی چوبی", "نبات ساده", "نبات عسلی"],
    "مربا": ["مربای هویج", "مربای آلبالو", "مربای بالنگ", "مربای به"],
    "کاسترد": ["پودر کاسترد وانیلی", "پودر کاسترد شکلاتی"],
    "پودر ژله": ["پودر ژله انبه", "پودر ژله آلبالو", "پودر ژله پرتقال"],
    "پودر کیک": ["پودر کیک وانیلی", "پودر کیک شکلاتی", "پودر کیک پرتقالی"],
    "کنسرو باختر": ["کنسرو لوبیا باختر", "کنسرو خورشت قیمه باختر", "کنسرو عدسی باختر"],
    "کنسرو کمپوت": ["کمپوت آلبالو", "کمپوت هلو", "کمپوت آناناس"],
    "نوشیدنی گیاهی": ["شربت آلبالو گیاهی", "شربت سکنجبین", "نوشیدنی گیاهی زعفرانی"],
    "بهداشتی": ["دستمال کاغذی جعبه‌ای", "مایع ظرفشویی", "پودر شوینده"],
    "ترشیجات": ["ترشی مخلوط سنتی", "ترشی سیر", "ترشی بادمجان"],
    "آردیجات و سوخاری": ["آرد سوخاری کلاسیک", "پودر سوخاری ادویه‌دار", "آرد نان ویژه"],
    "ماسالاتی": ["پودر ماسالا مخصوص", "ادویه ماسالای هندی"],
    "کافی قهوه کاکائو": ["پودر کاکائو خالص", "قهوه فوری کلاسیک", "پودر قهوه ترک", "کاپوچینو فوری"],
    "هالیدی": ["پک هدیه هالیدی ویژه", "پک هدیه چای و دمنوش"],
    "جت کلین": ["پودر جت کلین چندمنظوره", "اسپری جت کلین شیشه"],
    "سایر": ["محصول متفرقه یک", "محصول متفرقه دو", "محصول متفرقه سه"],
}

PACK_DESCRIPTORS_COUNT = ["100 گرمی", "250 گرمی", "500 گرمی", "1 کیلویی", "12 عددی", "24 عددی", "بسته خانواده"]
PACK_DESCRIPTORS_WEIGHT = ["فله", "کیسه 5 کیلویی", "کیسه 10 کیلویی", "بسته ویژه"]

FIRST_NAMES_M = ["علی", "رضا", "محمد", "حسین", "امیر", "مهدی", "احمد", "کریم", "جواد", "حمید", "سعید", "بهروز", "فرهاد", "کاظم", "ناصر", "یوسف", "داوود", "مجید", "پیمان", "آرمان"]
FIRST_NAMES_F = ["زهرا", "فاطمه", "مریم", "سارا", "نرگس", "الهام", "شیوا", "لیلا", "نگار", "پریسا", "مینا", "سمیرا", "آزاده", "فرشته", "هانیه", "رویا", "شادی", "طاهره", "بهاره", "نیلوفر"]
LAST_NAMES = ["احمدی", "محمدی", "رضایی", "حسینی", "کریمی", "موسوی", "صادقی", "نجفی", "قاسمی", "رحیمی", "جعفری", "طاهری", "کاظمی", "یوسفی", "شریفی", "فرهادی", "نوری", "صالحی", "عباسی", "امینی", "زارعی", "ملکی", "حیدری", "غفاری", "بهرامی"]

COMPANY_PREFIXES = ["فروشگاه", "سوپرمارکت", "هایپرمارکت", "فروشگاه زنجیره‌ای", "بازرگانی", "پخش مواد غذایی", "عمده‌فروشی", "تعاونی مصرف", "مرکز پخش"]
COMPANY_NAMES = ["ستاره", "بهار", "نور", "امید", "پارسیان", "کوروش", "الوند", "زاگرس", "دماوند", "سبلان", "کیمیا", "آفتاب", "نگین", "گلستان", "سپید", "شمیم", "الماس", "پویا", "ایرانیان", "برکت"]

WAREHOUSES = [
    "انبار کالای ساخته شده مرکزی", "انبار مواد اولیه", "انبار مویرگی مشهد",
    "انبار مویرگی تهران", "انبار مویرگی اصفهان", "انبار مویرگی رشت",
    "انبار مویرگی قزوین", "انبار صادراتی", "انبار خرده فروشی مشهد",
    "انبار زنجیره‌ای مشهد", "انبار نمایندگی", "انبار بسته‌بندی",
    "انبار ضایعات و مرجوعی", "انبار موقت مصلی", "انبار مرکز خراسان",
    "انبار فرآورده‌های ویژه", "انبار کالای در جریان تولید", "انبار پشتیبانی فروش",
]

ORG_UNITS = {
    "تولید": ["اپراتور خط تولید", "سرپرست تولید", "کارشناس برنامه‌ریزی تولید", "مدیر تولید"],
    "فروش": ["کارمند فروش ( بازاریاب )", "سرپرست فروش", "کارشناس فروش داخلی", "مدیر فروش"],
    "انبار": ["انباردار", "سرپرست انبار", "کارشناس کنترل موجودی"],
    "مالی": ["کارشناس مالی", "حسابدار", "سرپرست حسابداری", "مدیر مالی"],
    "منابع انسانی": ["کارشناس منابع انسانی", "کارشناس آموزش", "مدیر منابع انسانی"],
    "کیفیت": ["کارشناس کنترل کیفیت", "سرپرست آزمایشگاه", "کارشناس QC"],
    "فناوری اطلاعات": ["کارشناس فناوری اطلاعات", "پشتیبان نرم‌افزار", "مدیر فناوری اطلاعات"],
    "مدیریت": ["مدیرعامل", "معاون اجرایی", "دستیار مدیرعامل"],
    "بازرگانی": ["کارشناس بازرگانی خارجی", "کارشناس خرید", "مدیر بازرگانی"],
    "پشتیبانی": ["کارمند خدمات اداری", "راننده", "نگهبان", "کارشناس پشتیبانی"],
}

VISITOR_FIRST_NAMES = FIRST_NAMES_M + FIRST_NAMES_F

log("Reference pools built.")

# --------------------------------------------------------------------------
# Item pool
# --------------------------------------------------------------------------


class Item:
    __slots__ = ("code", "name", "group", "unit_family", "base_price", "active",
                 "carton_size", "kg_per_unit")

    def __init__(self, code, name, group, unit_family, base_price, active, carton_size, kg_per_unit):
        self.code = code
        self.name = name
        self.group = group
        self.unit_family = unit_family
        self.base_price = base_price
        self.active = active
        self.carton_size = carton_size
        self.kg_per_unit = kg_per_unit


items = []
_item_seq = 1
for group in ITEM_GROUPS:
    unit_family, pmin, pmax = GROUP_META[group]
    stems = GROUP_STEMS[group]
    descriptors = PACK_DESCRIPTORS_WEIGHT if unit_family == "weight" else PACK_DESCRIPTORS_COUNT
    for stem in stems:
        # 1-3 pack-size variants per stem so the total catalog lands in the
        # ~150-200 SKU range even though the base stem list is shorter.
        n_variants = random.choices([1, 2, 3], weights=[35, 45, 20], k=1)[0]
        used_descriptors = random.sample(descriptors, k=min(n_variants, len(descriptors)))
        for descriptor in used_descriptors:
            code = f"DM-{_item_seq:04d}"
            _item_seq += 1
            name = f"{stem} {descriptor}"
            base_price = round(random.uniform(pmin, pmax), -3)
            active = random.random() < 0.70
            carton_size = random.choice([6, 12, 24, 40, None])
            # kg per "count" unit - used to keep qty_normalized_count/kg consistent
            kg_per_unit = round(random.uniform(0.15, 1.2), 3)
            items.append(Item(code, name, group, unit_family, base_price, active, carton_size, kg_per_unit))

ITEM_BY_CODE = {it.code: it for it in items}
log(f"Items generated: {len(items)}")

# --------------------------------------------------------------------------
# Customer pool
# --------------------------------------------------------------------------


class Customer:
    __slots__ = ("code", "name", "branch", "region", "province", "sales_center", "visitor")

    def __init__(self, code, name, branch, region, province, sales_center, visitor):
        self.code = code
        self.name = name
        self.branch = branch
        self.region = region
        self.province = province
        self.sales_center = sales_center
        self.visitor = visitor


N_CUSTOMERS = 216


def make_person_name():
    fn = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
    ln = random.choice(LAST_NAMES)
    return f"{fn} {ln}"


def make_company_name():
    prefix = random.choice(COMPANY_PREFIXES)
    nm = random.choice(COMPANY_NAMES)
    return f"{prefix} {nm}"


N_VISITORS = 30
visitor_names = []
_used_visitor_names = set()
while len(visitor_names) < N_VISITORS:
    nm = f"{random.choice(VISITOR_FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    if nm not in _used_visitor_names:
        _used_visitor_names.add(nm)
        visitor_names.append(nm)

visitor_home_center = {v: random.choice(SALES_CENTERS_CORE) for v in visitor_names}

customers = []
for i in range(1, N_CUSTOMERS + 1):
    code = f"C-{i:04d}"
    is_person = random.random() < 0.60
    name = make_person_name() if is_person else make_company_name()
    branch = random.choice(BRANCHES)
    region = random.choice(BRANCH_TO_REGIONS[branch])
    province = BRANCH_TO_PROVINCE[branch] if random.random() < 0.8 else random.choice(PROVINCES)
    sales_center = BRANCH_TO_SALES_CENTER[branch] if random.random() < 0.7 else random.choice(SALES_CENTERS_CORE)
    visitor = random.choice(visitor_names)
    customers.append(Customer(code, name, branch, region, province, sales_center, visitor))

CUSTOMER_BY_CODE = {c.code: c for c in customers}
log(f"Customers generated: {len(customers)}")

# Pareto-ish selection weights so a handful of customers dominate revenue
_cust_order = list(range(len(customers)))
random.shuffle(_cust_order)
CUSTOMER_WEIGHTS = [0.0] * len(customers)
for rank, idx in enumerate(_cust_order):
    CUSTOMER_WEIGHTS[idx] = 1.0 / ((rank + 1) ** 0.85)

# --------------------------------------------------------------------------
# HR employees (80), including the 30 visitors as sales reps
# --------------------------------------------------------------------------


class Employee:
    __slots__ = ("code", "name", "org_unit", "position", "employment_type",
                 "hire_y", "hire_m", "hire_d", "term_y", "term_m", "term_d")

    def __init__(self, code, name, org_unit, position, employment_type, hire_y, hire_m, hire_d):
        self.code = code
        self.name = name
        self.org_unit = org_unit
        self.position = position
        self.employment_type = employment_type
        self.hire_y = hire_y
        self.hire_m = hire_m
        self.hire_d = hire_d
        self.term_y = None
        self.term_m = None
        self.term_d = None


N_EMPLOYEES = 80
N_TERMINATED = 12

employees = []


def random_past_date(min_months_ago, max_months_ago):
    months_ago = random.randint(min_months_ago, max_months_ago)
    y, m = add_months(TODAY.year, TODAY.month, -months_ago)
    d = random.randint(1, days_in_month(y, m))
    return y, m, d


# 30 sales-rep employees whose names EXACTLY match the shared visitor pool
for i, vname in enumerate(visitor_names):
    code = f"P-{i + 1:04d}"
    hy, hm, hd = random_past_date(6, 96)
    et = random.choice(["قراردادی زرین", "قراردادی سیمین"])
    employees.append(Employee(code, vname, "فروش", "کارمند فروش ( بازاریاب )", et, hy, hm, hd))

# remaining employees across other departments
_used_names = set(visitor_names)
remaining = N_EMPLOYEES - N_VISITORS
non_sales_units = [u for u in ORG_UNITS if u != "فروش"]
for i in range(remaining):
    code = f"P-{N_VISITORS + i + 1:04d}"
    nm = make_person_name()
    while nm in _used_names:
        nm = make_person_name()
    _used_names.add(nm)
    org_unit = random.choice(non_sales_units + ["فروش"])  # a few extra non-visitor sales/admin staff too
    position = random.choice(ORG_UNITS[org_unit])
    if position == "کارمند فروش ( بازاریاب )":
        # keep this exact title reserved for the visitor pool to avoid ambiguity
        position = "سرپرست فروش"
    hy, hm, hd = random_past_date(6, 240)
    et = random.choice(["قراردادی زرین", "قراردادی سیمین"])
    employees.append(Employee(code, nm, org_unit, position, et, hy, hm, hd))

# choose terminated employees (favor non-visitors slightly, but allow a couple of visitors -> "ترک کار" marketers)
term_candidates = list(range(len(employees)))
random.shuffle(term_candidates)
terminated_idx = set(term_candidates[:N_TERMINATED])
for idx in terminated_idx:
    emp = employees[idx]
    min_after_hire = 1
    months_ago = random.randint(1, 24)
    ty, tm = add_months(TODAY.year, TODAY.month, -months_ago)
    # ensure termination after hire
    hire_ord = emp.hire_y * 12 + emp.hire_m
    if ty * 12 + tm <= hire_ord:
        ty, tm = add_months(emp.hire_y, emp.hire_m, 3)
        if ty * 12 + tm >= TODAY.year * 12 + TODAY.month:
            continue  # skip - keep active, hired too recently to have a sensible termination
    td = random.randint(1, days_in_month(ty, tm))
    emp.term_y, emp.term_m, emp.term_d = ty, tm, td

n_active = sum(1 for e in employees if e.term_y is None)
log(f"HR employees generated: {len(employees)} (active={n_active}, terminated={len(employees) - n_active})")

print("Reference pools + items + customers + employees generated.", file=sys.stderr)

# --------------------------------------------------------------------------
# sales.db :: sales_lines (invoice-based generation over the last 24 months)
# --------------------------------------------------------------------------

N_HISTORY_MONTHS = 24
INVOICE_TYPES = [
    ("فاکتور فروش", 1, 0.80),
    ("درخواست فروش", 1, 0.10),
    ("حواله تاییدشده", 1, 0.03),
    ("فاکتور برگشتي", -1, 0.07),
]
_invoice_type_choices = [t[0] for t in INVOICE_TYPES]
_invoice_type_signs = {t[0]: t[1] for t in INVOICE_TYPES}
_invoice_type_weights = [t[2] for t in INVOICE_TYPES]

LINES_PER_INVOICE_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8]
LINES_PER_INVOICE_WEIGHTS = [10, 25, 25, 15, 10, 7, 5, 3]

RECORD_SOURCE_CURRENT_MONTH = ["ماه جاری", "درخواست موقت (نمایندگی)", "حواله تاییدشده (موقت)"]
RECORD_SOURCE_CURRENT_MONTH_WEIGHTS = [70, 15, 15]

# item selection weights: mostly active-basket items, but inactive items still show up
_item_weights = [3.0 if it.active else 1.0 for it in items]

# tag ~15% of items as "cold" (only sold in months older than the most recent 2 months)
# so the inventory module has real "no recent sales" candidates to classify as stagnant.
_cold_items = set(random.sample([it.code for it in items], k=max(1, len(items) // 7)))

sales_rows = []  # list of dicts matching sales_lines columns
_invoice_seq = 1

month_list = []
cursor_y, cursor_m = TODAY.year, TODAY.month
for i in range(N_HISTORY_MONTHS):
    month_list.append((cursor_y, cursor_m))
    cursor_y, cursor_m = add_months(cursor_y, cursor_m, -1)
month_list.reverse()  # oldest -> newest, last entry is the current (partial) month

for month_idx, (y, m) in enumerate(month_list):
    months_ago = len(month_list) - 1 - month_idx
    is_current_month = (y == TODAY.year and m == TODAY.month)
    dim = days_in_month(y, m)
    max_day = TODAY.day if is_current_month else dim

    base_invoices = 70 * (1.018 ** month_idx)  # slow growth trend across the 24-month window
    noise = random.uniform(0.82, 1.18)
    n_invoices = base_invoices * noise
    if is_current_month:
        n_invoices *= max_day / dim  # partial month -> proportionally fewer invoices so far
    n_invoices = max(5, round(n_invoices))

    price_factor = (1 + MONTHLY_INFLATION) ** (-months_ago)

    for _ in range(n_invoices):
        day = random.randint(1, max_day)
        date_str = jstr(y, m, day)

        inv_type = random.choices(_invoice_type_choices, weights=_invoice_type_weights, k=1)[0]
        sign = _invoice_type_signs[inv_type]

        if is_current_month:
            record_source = random.choices(
                RECORD_SOURCE_CURRENT_MONTH, weights=RECORD_SOURCE_CURRENT_MONTH_WEIGHTS, k=1
            )[0]
        else:
            record_source = "نهایی"

        customer = random.choices(customers, weights=CUSTOMER_WEIGHTS, k=1)[0]
        visitor = customer.visitor if random.random() < 0.92 else random.choice(visitor_names)
        sales_center = customer.sales_center if random.random() < 0.85 else visitor_home_center[visitor]
        province = customer.province if random.random() < 0.96 else None

        invoice_no = f"{y}{_invoice_seq:07d}"
        _invoice_seq += 1

        n_lines = random.choices(LINES_PER_INVOICE_CHOICES, weights=LINES_PER_INVOICE_WEIGHTS, k=1)[0]

        # pick items for this invoice, avoiding "cold" items in the most recent 2 months
        available_items = items
        if months_ago < 2:
            available_items = [it for it in items if it.code not in _cold_items]
            avail_weights = [3.0 if it.active else 1.0 for it in available_items]
        else:
            avail_weights = _item_weights

        chosen_items = random.choices(available_items, weights=avail_weights, k=n_lines)

        for item in chosen_items:
            if item.unit_family == "count":
                qty_raw = random.randint(1, 60)
                unit_raw = "عدد"
                qty_count = float(qty_raw)
                qty_kg = round(qty_raw * item.kg_per_unit, 3)
            else:
                qty_raw = round(random.uniform(2, 250), 1)
                unit_raw = "کیلوگرم"
                qty_kg = qty_raw
                qty_count = round(qty_raw / item.kg_per_unit, 3)

            unit_price = round(item.base_price * price_factor * random.uniform(0.94, 1.06), -2)
            amount = round(qty_raw * unit_price)
            vat_amount = round(amount * 0.09) if random.random() < 0.3 else 0
            discount_amount = round(amount * random.uniform(0, 0.08)) if random.random() < 0.5 else 0
            net_amount = sign * (amount - discount_amount)

            carton_size = item.carton_size
            effective_carton = carton_size if carton_size else 1
            qty_count_signed = qty_count * sign
            qty_kg_signed = qty_kg * sign
            qty_carton_signed = qty_count_signed / effective_carton

            sales_rows.append({
                "record_source": record_source,
                "invoice_type": inv_type,
                "item_code": item.code,
                "item_name": item.name,
                "unit_raw": unit_raw,
                "qty_raw": qty_raw,
                "sales_center": sales_center,
                "customer_code": customer.code,
                "customer_name": customer.name,
                "canonical_customer_code": customer.code,
                "visitor_name": visitor,
                "invoice_no": invoice_no,
                "invoice_date_jalali": date_str,
                "erp_base_unit_UNRELIABLE": unit_raw,
                "erp_base_qty_UNRELIABLE": qty_raw,
                "erp_base_unit_price_UNRELIABLE": unit_price,
                "unit_price": unit_price,
                "amount": amount,
                "vat_amount": vat_amount,
                "discount_amount": discount_amount,
                "sign": sign,
                "net_amount": net_amount,
                "unit_family": item.unit_family,
                "unit_conversion_ratio": item.kg_per_unit,
                "qty_normalized_count": qty_count,
                "qty_normalized_kg": qty_kg,
                "qty_normalized_count_signed": qty_count_signed,
                "qty_normalized_kg_signed": qty_kg_signed,
                "carton_size": carton_size,
                "qty_normalized_carton_signed": qty_carton_signed,
                "item_group": item.group,
                "is_active_basket": 1 if item.active else 0,
                "province": province,
            })

log(f"sales_lines rows generated: {len(sales_rows)}")
log(f"sales invoices generated: {_invoice_seq - 1}")
print(f"sales_lines rows: {len(sales_rows)}", file=sys.stderr)

MAX_SALES_DATE = max(r["invoice_date_jalali"] for r in sales_rows)


def _parse_jalali(s):
    y, m, d = (int(x) for x in s.split("/"))
    return y, m, d


def _jdn_of(s):
    y, m, d = _parse_jalali(s)
    return jdn(y, m, d)


MAX_SALES_JDN = _jdn_of(MAX_SALES_DATE)

# --------------------------------------------------------------------------
# Derived per-item aggregates needed for inventory.db consistency
# (mirrors backend/src/routes/inventory.ts logic exactly: last-30-day window
# ending at MAX(invoice_date_jalali), using qty_normalized_count_signed)
# --------------------------------------------------------------------------

_last30_start_jdn = MAX_SALES_JDN - 29
avg_daily_sales_by_item = {it.code: 0.0 for it in items}
_sum30 = {it.code: 0.0 for it in items}
sum_amount_by_item = {it.code: 0.0 for it in items}
sum_qty_count_signed_by_item = {it.code: 0.0 for it in items}

for r in sales_rows:
    code = r["item_code"]
    sum_amount_by_item[code] += r["net_amount"]
    sum_qty_count_signed_by_item[code] += r["qty_normalized_count_signed"]
    d_jdn = _jdn_of(r["invoice_date_jalali"])
    if _last30_start_jdn <= d_jdn <= MAX_SALES_JDN:
        _sum30[code] += r["qty_normalized_count_signed"]

for code in avg_daily_sales_by_item:
    avg_daily_sales_by_item[code] = _sum30[code] / 30.0

avg_price_by_item = {}
for code in sum_amount_by_item:
    q = sum_qty_count_signed_by_item[code]
    avg_price_by_item[code] = (sum_amount_by_item[code] / q) if q > 0 else 0.0

print("Sales generation + derived aggregates done.", file=sys.stderr)

# --------------------------------------------------------------------------
# receivables.db :: receivable_invoices + customer_dim
# --------------------------------------------------------------------------

N_RECEIVABLE_INVOICES = 820
N_BOUNCED_CHECKS = 38

DEBT_AGE_BUCKETS = [
    (0, 15, "0-15 روز"),
    (16, 30, "16-30 روز"),
    (31, 60, "31-60 روز"),
    (61, 90, "61-90 روز"),
    (91, 10 ** 6, "بیش از 90 روز"),
]


def debt_age_bucket(age_days: float) -> str:
    for lo, hi, label in DEBT_AGE_BUCKETS:
        if lo <= age_days <= hi:
            return label
    return "بیش از 90 روز"


receivable_rows = []
_recv_seq = 1

# pick which rows become bounced checks up front
_bounced_flags = [False] * N_RECEIVABLE_INVOICES
for i in random.sample(range(N_RECEIVABLE_INVOICES), N_BOUNCED_CHECKS):
    _bounced_flags[i] = True

_recv_months_ago_choices = list(range(0, 15))
_recv_months_ago_weights = [30 * (0.72 ** ma) + 1.2 for ma in _recv_months_ago_choices]  # front-loaded, long tail

for i in range(N_RECEIVABLE_INVOICES):
    customer = random.choices(customers, weights=CUSTOMER_WEIGHTS, k=1)[0]
    months_ago = random.choices(_recv_months_ago_choices, weights=_recv_months_ago_weights, k=1)[0]
    y, m = add_months(TODAY.year, TODAY.month, -months_ago)
    dim = days_in_month(y, m)
    max_day = TODAY.day if (y == TODAY.year and m == TODAY.month) else dim
    day = random.randint(1, max_day)
    date_str = jstr(y, m, day)
    age_days = TODAY_JDN - jdn(y, m, day)

    is_bounced = _bounced_flags[i]
    if is_bounced:
        invoice_kind = "چک برگشتي"
    else:
        invoice_kind = random.choices(["فاکتور", "اعلامیه بدهکار"], weights=[93, 7], k=1)[0]

    net_amount = round(random.uniform(80_000_000, 9_000_000_000), -4)
    if is_bounced:
        # bounced checks are essentially fully unpaid
        paid_ratio = random.uniform(0, 0.15)
    else:
        # skew towards mostly-paid, but keep a realistic overdue tail
        paid_ratio = min(1.0, max(0.0, random.betavariate(4.0, 1.3)))
    amount_paid = round(net_amount * paid_ratio)
    amount_unpaid = max(0, net_amount - amount_paid)

    collection_delay_days = age_days if amount_unpaid > 0 else round(random.uniform(0, 25))
    collection_delay_days_secondary = max(0, collection_delay_days + random.randint(-3, 3))
    collection_delay_penalty = round(amount_unpaid * 0.0004 * max(0, age_days - 30), 0) if amount_unpaid > 0 else 0

    due_bucket_15d = "بالای 15 روز" if age_days > 15 else "زیر 15 روز"
    age_bucket = debt_age_bucket(age_days)

    invoice_no = f"RC-{_recv_seq:06d}"
    _recv_seq += 1

    receivable_rows.append({
        "row_no": str(i + 1),
        "region": customer.region,
        "branch": customer.branch,
        "province": customer.province,
        "customer_code": customer.code,
        "customer_name": customer.name,
        "customer_group": None,
        "customer_total_debt": None,  # filled in after aggregation below
        "invoice_no": invoice_no,
        "invoice_kind": invoice_kind,
        "invoice_date_jalali": date_str,
        "invoice_net_amount": net_amount,
        "amount_paid": amount_paid,
        "amount_unpaid": amount_unpaid,
        "invoice_debt_age_days": age_days,
        "collection_delay_days": collection_delay_days,
        "collection_delay_days_secondary": collection_delay_days_secondary,
        "collection_delay_penalty": collection_delay_penalty,
        "visitor_name": customer.visitor,
        "source_file": "مانده مطالبات.xlsx",
        "source_sheet": "Sheet1",
        "invoice_year_jalali": str(y),
        "invoice_month_jalali": f"{m:02d}",
        "invoice_year_month_jalali": f"{y}/{m:02d}",
        "due_bucket_15d": due_bucket_15d,
        "debt_age_bucket_detailed": age_bucket,
    })

# aggregate customer_total_debt per customer and back-fill into each row + customer_dim
_debt_by_customer = {}
for r in receivable_rows:
    _debt_by_customer[r["customer_code"]] = _debt_by_customer.get(r["customer_code"], 0) + r["amount_unpaid"]
for r in receivable_rows:
    r["customer_total_debt"] = _debt_by_customer.get(r["customer_code"], 0)

customer_dim_rows = []
for i, c in enumerate(customers):
    customer_dim_rows.append({
        "row_no": str(i + 1),
        "customer_code": c.code,
        "customer_name": c.name,
        "customer_group": None,
        "region": c.region,
        "branch": c.branch,
        "province": c.province,
        "customer_total_debt": _debt_by_customer.get(c.code, 0),
    })

log(f"receivable_invoices rows generated: {len(receivable_rows)} (bounced checks: {N_BOUNCED_CHECKS})")
log(f"customer_dim rows generated: {len(customer_dim_rows)}")
print(f"receivable_invoices rows: {len(receivable_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# pnl.db :: pnl_long
# --------------------------------------------------------------------------
# Item/category rows per month must satisfy the exact `item` text values the
# backend routes filter on directly:
#   "فروش خالص", "بهاي تمام شده كالاي فروش رفته تولیدی",
#   "سود و (زیان )", "سود و (زیان ) خالص"
# and `category LIKE '%هزینه%'` must match exactly the four opex categories
# below (not the COGS category) so pnlRouter's totalExpenses/expense-breakdown
# only sums operating expenses, matching the real app's convention.

PNL_LONG_MONTHS = 23  # ~2 years, ending at the current month

pnl_long_rows = []
_pnl_month_list = []
cy, cm = TODAY.year, TODAY.month
for i in range(PNL_LONG_MONTHS):
    _pnl_month_list.append((cy, cm))
    cy, cm = add_months(cy, cm, -1)
_pnl_month_list.reverse()

_base_net_sales = 180_000_000_000  # oldest month net sales (Rial)
_pnl_month_seq = 1
for idx, (y, m) in enumerate(_pnl_month_list):
    growth = (1.022 ** idx) * random.uniform(0.95, 1.05)
    net_sales = round(_base_net_sales * growth, -5)

    cogs_ratio = random.uniform(0.52, 0.58)
    prod_ratio = random.uniform(0.04, 0.06)
    dist_ratio = random.uniform(0.13, 0.17)
    admin_ratio = random.uniform(0.07, 0.09)
    interest_ratio = random.uniform(0.02, 0.04)

    cogs = round(net_sales * cogs_ratio)
    prod_cost = round(net_sales * prod_ratio)
    dist_cost = round(net_sales * dist_ratio)
    admin_cost = round(net_sales * admin_ratio)
    interest_cost = round(net_sales * interest_ratio)
    opex_total = prod_cost + dist_cost + admin_cost + interest_cost

    gross_result = net_sales - cogs - opex_total
    adjustment = round(net_sales * random.uniform(-0.01, 0.01))
    net_result_final = gross_result + adjustment

    month_name = MONTH_NAMES_FA[m - 1]
    rows_for_month = [
        ("درآمد (فروش خالص)", "فروش خالص", net_sales),
        ("بهای تمام‌شده کالای فروش رفته", "بهاي تمام شده كالاي فروش رفته تولیدی", cogs),
        ("هزینه تولید", "هزینه تولید", prod_cost),
        ("هزینه توزیع و فروش", "هزینه توزیع و فروش", dist_cost),
        ("هزینه مالی و اداری", "هزینه مالی و اداری", admin_cost),
        ("هزینه مالی (بهره)", "هزینه مالی (بهره)", interest_cost),
        ("جمع محاسبه‌شده", "جمع هزینه‌های عملیاتی", opex_total),
        ("نتیجه نهایی", "سود و (زیان )", gross_result),
        ("تعدیلات سود و زیان", "تعدیلات سود و زیان", adjustment),
        ("نتیجه نهایی خالص (Bottom Line)", "سود و (زیان ) خالص", net_result_final),
    ]
    for row_no, (category, item, amount_rial) in enumerate(rows_for_month, start=1):
        pnl_long_rows.append({
            "row_no": float(row_no),
            "item": item,
            "category": category,
            "year_jalali": float(y),
            "month_num": float(m),
            "month_name": month_name,
            "month_seq": float(_pnl_month_seq),
            "amount_rial": float(amount_rial),
            "amount_before_correction": float(amount_rial),
            "percent_of_net_sales": (amount_rial / net_sales * 100.0) if net_sales else None,
            "source": "سود و زیان محصول و بازاریاب.xlsx",
            "note": None,
        })
    _pnl_month_seq += 1

log(f"pnl_long rows generated: {len(pnl_long_rows)} ({PNL_LONG_MONTHS} months)")
print(f"pnl_long rows: {len(pnl_long_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# pnl.db :: pnl_product_marketer_lines (last 12 months, invoice-based)
# --------------------------------------------------------------------------

N_PNL_LINE_MONTHS = 12
pnl_lines_rows = []
_pnl_invoice_seq = 1

_pnl_month_list_short = _pnl_month_list[-N_PNL_LINE_MONTHS:]
_item_active_weights = [3.0 if it.active else 1.0 for it in items]

CENTER_CODE = {c: f"{i + 1:02d}" for i, c in enumerate(ALL_PNL_CENTERS)}

for m_idx, (y, m) in enumerate(_pnl_month_list_short):
    is_current_month = (y == TODAY.year and m == TODAY.month)
    dim = days_in_month(y, m)
    max_day = TODAY.day if is_current_month else dim
    n_invoices = max(8, round(95 * random.uniform(0.85, 1.15) * (max_day / dim if is_current_month else 1)))

    for _ in range(n_invoices):
        day = random.randint(1, max_day)
        date_str = jstr(y, m, day)
        customer = random.choices(customers, weights=CUSTOMER_WEIGHTS, k=1)[0]
        employee_name = customer.visitor if random.random() < 0.9 else random.choice(visitor_names)
        sales_center = customer.sales_center if random.random() < 0.85 else visitor_home_center[employee_name]
        invoice_no = f"PM-{y}{_pnl_invoice_seq:06d}"
        _pnl_invoice_seq += 1

        n_lines = random.choices(LINES_PER_INVOICE_CHOICES, weights=LINES_PER_INVOICE_WEIGHTS, k=1)[0]
        chosen_items = random.choices(items, weights=_item_active_weights, k=n_lines)
        for item in chosen_items:
            if item.unit_family == "count":
                qty = random.randint(1, 60)
                unit = "عدد"
            else:
                qty = round(random.uniform(2, 250), 1)
                unit = "کیلوگرم"
            unit_price = round(item.base_price * random.uniform(0.95, 1.05), -2)
            amount = round(qty * unit_price)
            discount = round(amount * random.uniform(0, 0.05)) if random.random() < 0.4 else 0
            net_sales = amount - discount
            cost_ratio = random.uniform(0.55, 0.72)
            cost_unit_price = round(unit_price * cost_ratio, -2)
            cost_amount = round(qty * cost_unit_price)
            profit_loss = net_sales - cost_amount
            profit_pct_1 = (profit_loss / net_sales * 100.0) if net_sales else None
            profit_pct_2 = (profit_loss / amount * 100.0) if amount else None
            shared_cost_share = round(net_sales * 0.17)
            profit_after_shared = profit_loss - shared_cost_share
            profit_pct_after_1 = (profit_after_shared / net_sales * 100.0) if net_sales else None
            profit_pct_after_2 = (profit_after_shared / amount * 100.0) if amount else None

            pnl_lines_rows.append({
                "invoice_no": invoice_no,
                "invoice_date_jalali": date_str,
                "item_code": item.code,
                "item_name": item.name,
                "unit": unit,
                "form_type": random.choice(["کارتن", "بسته", "فله"]),
                "item_group": item.group,
                "center_code": CENTER_CODE[sales_center],
                "sales_center": sales_center,
                "customer_code": customer.code,
                "customer_name": customer.name,
                "employee_name": employee_name,
                "qty": float(qty),
                "unit_price": float(unit_price),
                "amount": float(amount),
                "discount": float(discount),
                "net_sales": float(net_sales),
                "cost_unit_price": float(cost_unit_price),
                "cost_amount": float(cost_amount),
                "profit_loss": float(profit_loss),
                "profit_pct_1": profit_pct_1,
                "profit_pct_2": profit_pct_2,
                "shared_cost_share_17pct": float(shared_cost_share),
                "profit_loss_after_shared_cost": float(profit_after_shared),
                "profit_pct_after_shared_1": profit_pct_after_1,
                "profit_pct_after_shared_2": profit_pct_after_2,
                "is_active_basket": 1.0 if item.active else 0.0,
            })

log(f"pnl_product_marketer_lines rows generated: {len(pnl_lines_rows)}")
print(f"pnl_product_marketer_lines rows: {len(pnl_lines_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# pnl.db :: pnl_center_lines (last 3 periods x 14 core centers, + 3 extra
# centers in the latest period only)
# --------------------------------------------------------------------------

_pnl_center_periods = _pnl_month_list[-3:]
_center_size_weight = {c: random.uniform(0.5, 3.0) for c in ALL_PNL_CENTERS}

pnl_center_rows = []
for p_idx, (y, m) in enumerate(_pnl_center_periods):
    is_latest = (p_idx == len(_pnl_center_periods) - 1)
    centers_this_period = ALL_PNL_CENTERS if is_latest else SALES_CENTERS_CORE
    period_date = jstr(y, m, 1)
    for center in centers_this_period:
        weight = _center_size_weight[center]
        net_sales = round(6_000_000_000 * weight * random.uniform(0.85, 1.15), -5)
        discount_rate = random.uniform(0.02, 0.06)
        gross_sales_before_returns = round(net_sales / (1 - discount_rate))
        discounts = gross_sales_before_returns - net_sales
        gross_margin_rate = random.uniform(0.28, 0.42)
        gross_profit = round(net_sales * gross_margin_rate)
        headcount = max(2, round(3 + weight * random.uniform(4, 9)))
        avg_personnel_salary = round(random.uniform(260_000_000, 420_000_000), -5)
        salary_total = round(headcount * avg_personnel_salary)
        productivity_bonus_total = round(salary_total * random.uniform(0.03, 0.08))
        incentive_bonus_total = round(salary_total * random.uniform(0.02, 0.06))
        rent_expense = round(net_sales * random.uniform(0.01, 0.03))
        direct_expense = round(net_sales * random.uniform(0.01, 0.025))
        mortgage_expense = round(net_sales * random.uniform(0.0, 0.015))
        other_expense = round(net_sales * random.uniform(0.005, 0.02))
        total_opex = (
            salary_total + productivity_bonus_total + incentive_bonus_total
            + rent_expense + direct_expense + mortgage_expense + other_expense
        )
        net_profit = gross_profit - total_opex
        net_profit_pct = (net_profit / net_sales * 100.0) if net_sales else None
        gross_profit_pct = (gross_profit / net_sales * 100.0) if net_sales else None
        discount_to_sales_ratio = (discounts / net_sales) if net_sales else None
        incentive_to_sales_ratio = (incentive_bonus_total / net_sales) if net_sales else None

        pnl_center_rows.append({
            "sales_center": center,
            "cost_amount": float(round(net_sales - gross_profit)),
            "gross_sales_before_returns": float(gross_sales_before_returns),
            "discounts": float(discounts),
            "net_sales": float(net_sales),
            "gross_profit": float(gross_profit),
            "gross_profit_pct": gross_profit_pct,
            "headcount": float(headcount),
            "salary_total": float(salary_total),
            "productivity_bonus_total": float(productivity_bonus_total),
            "incentive_bonus_total": float(incentive_bonus_total),
            "avg_personnel_salary": float(avg_personnel_salary),
            "rent_expense": float(rent_expense),
            "direct_expense": float(direct_expense),
            "mortgage_expense": float(mortgage_expense),
            "other_expense": float(other_expense),
            "net_profit": float(net_profit),
            "net_profit_pct": net_profit_pct,
            "discount_to_sales_ratio": discount_to_sales_ratio,
            "incentive_to_sales_ratio": incentive_to_sales_ratio,
            "period_date": period_date,
        })

log(f"pnl_center_lines rows generated: {len(pnl_center_rows)}")
print(f"pnl_center_lines rows: {len(pnl_center_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# targets.db :: target_visitor + target_branch
# --------------------------------------------------------------------------
# target_visitor.target_qty must be in the SAME "carton" unit as
# SUM(qty_normalized_carton_signed) grouped by (visitor, item_group, month) in
# sales_lines, so achievement% comes out sensible (not always null/absurd).
# We derive targets FROM the actual generated sales (+/- noise) rather than
# picking arbitrary numbers.

TARGET_MONTHS = 12
_target_month_list = _pnl_month_list_short if False else None  # unused placeholder
_target_month_list = month_list[-TARGET_MONTHS:]

# actual carton qty by (visitor, year, month, item_group) from sales_rows
_actual_carton = {}
for r in sales_rows:
    if not r["visitor_name"]:
        continue
    y, m, _d = _parse_jalali(r["invoice_date_jalali"])
    key = (r["visitor_name"], y, m, r["item_group"])
    _actual_carton[key] = _actual_carton.get(key, 0.0) + r["qty_normalized_carton_signed"]

# each visitor "specializes" in 2-3 item groups for target-setting purposes
VISITOR_TARGET_GROUPS = {v: random.sample(ITEM_GROUPS, k=random.randint(2, 3)) for v in visitor_names}

target_visitor_rows = []
for v in visitor_names:
    for (y, m) in _target_month_list:
        for group in VISITOR_TARGET_GROUPS[v]:
            actual = _actual_carton.get((v, y, m, group), 0.0)
            # base the target on actual sales with noise so achievement% lands mostly in a sane range;
            # if there was no actual sale that month/group, still set a small plausible target.
            if actual > 0:
                target_qty = max(1.0, round(actual / random.uniform(0.7, 1.3), 1))
            else:
                target_qty = round(random.uniform(20, 200), 1)
            target_visitor_rows.append({
                "visitor_name": v,
                "item_group": group,
                "year_jalali": y,
                "month_num": m,
                "target_qty": target_qty,
            })

log(f"target_visitor rows generated: {len(target_visitor_rows)}")
print(f"target_visitor rows: {len(target_visitor_rows)}", file=sys.stderr)

# target_branch: independent, simpler - reuses sales_center pool as branch_raw
TARGET_BRANCH_MONTHS = 14
_target_branch_month_list = month_list[-TARGET_BRANCH_MONTHS:]
LINE_LABELS = ["خط پخش مویرگی", "خط پخش زنجیره‌ای", "خط پخش عمده"]
_branch_target_groups = random.sample(ITEM_GROUPS, k=4)

target_branch_rows = []
for center in SALES_CENTERS_CORE:
    for (y, m) in _target_branch_month_list:
        for group in _branch_target_groups:
            target_branch_rows.append({
                "branch_raw": center,
                "line_raw": random.choice(LINE_LABELS),
                "item_group": group,
                "year_jalali": y,
                "month_num": m,
                "target_qty": round(random.uniform(500, 6000), 1),
            })

log(f"target_branch rows generated: {len(target_branch_rows)}")
print(f"target_branch rows: {len(target_branch_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# inventory.db :: inventory_lines
# --------------------------------------------------------------------------
# Deliberately vary sellable_qty relative to each item's REAL avg_daily_sales
# (computed above from the actual generated sales_rows) so the inventory
# route's own DIO classification naturally spreads across all 8 statuses.

DIO_STATUS_TARGETS = [
    "zero_stock",       # sellable_qty == 0
    "no_recent_sales",  # avg_daily_sales <= 0 but stock > 0
    "urgent",           # dio <= 7
    "soon",             # dio <= 15
    "adequate",         # dio <= 30
    "high",             # dio <= 60
    "very_high",        # dio <= 90
    "long_stagnant",    # dio > 90
]
DIO_TARGET_VALUE = {"urgent": 5, "soon": 12, "adequate": 20, "high": 45, "very_high": 75, "long_stagnant": 130}

inventory_rows = []
for idx, item in enumerate(items):
    n_warehouses = random.randint(4, 10)
    chosen_warehouses = random.sample(WAREHOUSES, k=min(n_warehouses, len(WAREHOUSES)))
    avg_daily = avg_daily_sales_by_item[item.code]

    status_bucket = DIO_STATUS_TARGETS[idx % len(DIO_STATUS_TARGETS)]
    if status_bucket == "zero_stock":
        total_sellable = 0.0
    elif status_bucket == "no_recent_sales" or avg_daily <= 0:
        # either genuinely no recent sales, or forced here because this item's
        # avg_daily happens to be 0 - either way, give it real positive stock
        total_sellable = round(random.uniform(50, 800), 1)
    else:
        dio_target = DIO_TARGET_VALUE[status_bucket]
        total_sellable = max(1.0, round(dio_target * avg_daily, 1))

    # split the total across the chosen warehouses
    if total_sellable <= 0:
        shares = [0.0] * len(chosen_warehouses)
    else:
        raw_shares = [random.uniform(0.3, 1.0) for _ in chosen_warehouses]
        s = sum(raw_shares)
        shares = [total_sellable * (x / s) for x in raw_shares]

    for wh, share in zip(chosen_warehouses, shares):
        reserved = round(share * random.uniform(0, 0.08), 1) if share > 0 else 0.0
        on_hand = round(share + reserved, 1)
        sellable = round(on_hand - reserved, 1)
        inventory_rows.append({
            "item_code": item.code,
            "item_name": item.name,
            "cost_center": f"{random.randint(100, 199)}",
            "warehouse_code": f"WH-{WAREHOUSES.index(wh) + 1:02d}",
            "warehouse_name": wh,
            "on_hand_qty": on_hand,
            "reserved_qty": reserved,
            "sellable_qty": sellable,
        })

log(f"inventory_lines rows generated: {len(inventory_rows)}")
print(f"inventory_lines rows: {len(inventory_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# hr.db :: personnel_records + headcount_by_month + employee_status + salary_per_capita
# --------------------------------------------------------------------------

DECREE_TYPES_MID = ["تغییر حقوق و مزایا", "افزایش حقوق سالیانه", "استقرار"]

personnel_records_rows = []
employee_status_rows = []

for emp in employees:
    hire_str = jstr(emp.hire_y, emp.hire_m, emp.hire_d)
    records = [{
        "employee_name": emp.name,
        "personnel_code": emp.code,
        "hire_date_jalali": hire_str,
        "issue_date_jalali": hire_str,
        "effective_date_jalali": hire_str,
        "approval_date_jalali": hire_str,
        "employment_type": emp.employment_type,
        "decree_type": "استخدام",
        "position": emp.position,
        "org_unit": emp.org_unit,
        "service_location": "دفتر مرکزی" if emp.org_unit in ("مدیریت", "مالی", "منابع انسانی", "فناوری اطلاعات") else "کارخانه/انبار",
        "hire_year": str(emp.hire_y),
        "issue_year": str(emp.hire_y),
        "effective_year": str(emp.hire_y),
        "approval_year": str(emp.hire_y),
    }]

    hire_ord = emp.hire_y * 12 + emp.hire_m
    term_ord = (emp.term_y * 12 + emp.term_m) if emp.term_y else (TODAY.year * 12 + TODAY.month)
    span = max(0, term_ord - hire_ord)
    n_mid_records = min(random.randint(1, 4), max(0, span // 6))

    used_ords = {hire_ord}
    for _ in range(n_mid_records):
        candidate_ord = random.randint(hire_ord + 1, max(hire_ord + 1, term_ord - 1)) if term_ord > hire_ord + 1 else None
        if candidate_ord is None or candidate_ord in used_ords:
            continue
        used_ords.add(candidate_ord)
        ry, rm = divmod(candidate_ord, 12)
        rm += 1
        rd = random.randint(1, days_in_month(ry, rm))
        rstr = jstr(ry, rm, rd)
        records.append({
            "employee_name": emp.name,
            "personnel_code": emp.code,
            "hire_date_jalali": hire_str,
            "issue_date_jalali": rstr,
            "effective_date_jalali": rstr,
            "approval_date_jalali": rstr,
            "employment_type": emp.employment_type,
            "decree_type": random.choice(DECREE_TYPES_MID),
            "position": emp.position,
            "org_unit": emp.org_unit,
            "service_location": "دفتر مرکزی" if emp.org_unit in ("مدیریت", "مالی", "منابع انسانی", "فناوری اطلاعات") else "کارخانه/انبار",
            "hire_year": str(emp.hire_y),
            "issue_year": str(ry),
            "effective_year": str(ry),
            "approval_year": str(ry),
        })

    if emp.term_y is not None:
        term_str = jstr(emp.term_y, emp.term_m, emp.term_d)
        records.append({
            "employee_name": emp.name,
            "personnel_code": emp.code,
            "hire_date_jalali": hire_str,
            "issue_date_jalali": term_str,
            "effective_date_jalali": term_str,
            "approval_date_jalali": term_str,
            "employment_type": emp.employment_type,
            "decree_type": "پایان خدمت",
            "position": emp.position,
            "org_unit": emp.org_unit,
            "service_location": "دفتر مرکزی" if emp.org_unit in ("مدیریت", "مالی", "منابع انسانی", "فناوری اطلاعات") else "کارخانه/انبار",
            "hire_year": str(emp.hire_y),
            "issue_year": str(emp.term_y),
            "effective_year": str(emp.term_y),
            "approval_year": str(emp.term_y),
        })

    records.sort(key=lambda r: r["issue_date_jalali"])
    personnel_records_rows.extend(records)

    employee_status_rows.append({
        "personnel_code": emp.code,
        "employee_name": emp.name,
        "hire_year_jalali": emp.hire_y,
        "hire_month_num": emp.hire_m,
        "termination_year_jalali": emp.term_y,
        "termination_month_num": emp.term_m,
    })

log(f"personnel_records rows generated: {len(personnel_records_rows)}")
print(f"personnel_records rows: {len(personnel_records_rows)}", file=sys.stderr)

# headcount_by_month: last 36 months, recomputed FROM employee_status
HEADCOUNT_MONTHS = 36
_hc_month_list = []
cy, cm = TODAY.year, TODAY.month
for i in range(HEADCOUNT_MONTHS):
    _hc_month_list.append((cy, cm))
    cy, cm = add_months(cy, cm, -1)
_hc_month_list.reverse()

headcount_by_month_rows = []
for (y, m) in _hc_month_list:
    key_ord = y * 100 + m
    count = 0
    for emp in employees:
        hire_key = emp.hire_y * 100 + emp.hire_m
        if hire_key > key_ord:
            continue
        if emp.term_y is not None:
            term_key = emp.term_y * 100 + emp.term_m
            if term_key <= key_ord:
                continue
        count += 1
    headcount_by_month_rows.append({
        "year_jalali": y,
        "month_num": m,
        "month_name": MONTH_NAMES_FA[m - 1],
        "headcount": count,
    })

log(f"headcount_by_month rows generated: {len(headcount_by_month_rows)}")

# salary_per_capita: last ~26 months, headcount matching headcount_by_month
SALARY_MONTHS = 26
_salary_month_list = _hc_month_list[-SALARY_MONTHS:]
_hc_by_ym = {(r["year_jalali"], r["month_num"]): r["headcount"] for r in headcount_by_month_rows}

salary_per_capita_rows = []
_base_per_capita = 240_000_000
for i, (y, m) in enumerate(_salary_month_list):
    per_capita = round(_base_per_capita * (1.018 ** i) * random.uniform(0.97, 1.03), -4)
    headcount = _hc_by_ym.get((y, m), 70)
    total_cost = round(per_capita * headcount)
    salary_per_capita_rows.append({
        "year_jalali": y,
        "month_num": m,
        "month_name": MONTH_NAMES_FA[m - 1],
        "total_salary_cost_rial": total_cost,
        "headcount": headcount,
        "salary_per_capita_rial": round(total_cost / headcount) if headcount else 0,
    })

log(f"salary_per_capita rows generated: {len(salary_per_capita_rows)}")
print(f"headcount_by_month rows: {len(headcount_by_month_rows)}, salary_per_capita rows: {len(salary_per_capita_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# finance.db :: finance_monthly (balance-sheet / corporate-finance snapshot,
# one row per month over the same 24-month window as sales_lines) - backs the
# 7 KPI tiles on the dashboard home page that used to say "coming soon"
# (annual budget realization, liabilities, debt/asset ratio, company value,
# total assets, cash balance, ROI). Deliberately an independent source from
# pnl.db/sales.db (same convention as the rest of this script - every module
# comes from its own file and is only loosely correlated with the others).
# --------------------------------------------------------------------------

FINANCE_BASE_ASSETS = 950_000_000_000        # oldest month, Rial
FINANCE_BASE_LIABILITIES_RATIO = 0.52         # liabilities / assets, oldest month
FINANCE_BASE_BUDGET_TARGET = 195_000_000_000  # oldest month, Rial (monthly revenue budget)

finance_monthly_rows = []
_fin_month_seq = 1
for idx, (y, m) in enumerate(month_list):
    growth = (1.02 ** idx) * random.uniform(0.97, 1.03)
    total_assets = round(FINANCE_BASE_ASSETS * growth, -6)

    liab_ratio = min(0.72, max(0.30, FINANCE_BASE_LIABILITIES_RATIO + random.uniform(-0.04, 0.04) + idx * 0.0015))
    total_liabilities = round(total_assets * liab_ratio, -6)

    cash_ratio = random.uniform(0.05, 0.09)
    cash_balance = round(total_assets * cash_ratio, -6)

    # ارزش شرکت: چند برابر حقوق صاحبان سهام (دارایی منهای بدهی) به‌علاوه‌ی کمی
    # نویز - یک برآورد ساده و باورپذیر برای دموی نمونه‌کار، نه یک مدل ارزش‌گذاری واقعی.
    equity = total_assets - total_liabilities
    company_value = round(equity * random.uniform(2.1, 2.6), -6)

    budget_target = round(FINANCE_BASE_BUDGET_TARGET * (1.019 ** idx) * random.uniform(0.98, 1.02), -6)
    # عملکرد واقعی بودجه: بیشتر ماه‌ها نزدیک هدف، با پراکندگی طبیعی حول آن
    budget_actual = round(budget_target * random.uniform(0.85, 1.12), -6)

    roi_pct = round(random.uniform(1.1, 2.6) + idx * 0.02, 2)  # بازده ماهانه، با روند صعودی ملایم

    finance_monthly_rows.append({
        "year_jalali": y,
        "month_num": m,
        "month_name": MONTH_NAMES_FA[m - 1],
        "month_seq": _fin_month_seq,
        "total_assets_rial": float(total_assets),
        "total_liabilities_rial": float(total_liabilities),
        "cash_balance_rial": float(cash_balance),
        "company_value_rial": float(company_value),
        "budget_target_rial": float(budget_target),
        "budget_actual_rial": float(budget_actual),
        "roi_pct": roi_pct,
    })
    _fin_month_seq += 1

log(f"finance_monthly rows generated: {len(finance_monthly_rows)}")
print(f"finance_monthly rows: {len(finance_monthly_rows)}", file=sys.stderr)

# --------------------------------------------------------------------------
# finance.db :: okr_objectives + okr_key_results ("چشم‌انداز و OKR" section)
# Entirely fake/demo-only, fixed content (not derived from other tables) -
# quarter label follows the real current Jalali season/year so the demo
# always looks "current" without needing to hand-edit dates.
# --------------------------------------------------------------------------

SEASON_NAMES_FA = ["بهار", "بهار", "بهار", "تابستان", "تابستان", "تابستان",
                   "پاییز", "پاییز", "پاییز", "زمستان", "زمستان", "زمستان"]
CURRENT_QUARTER_LABEL = f"{SEASON_NAMES_FA[TODAY.month - 1]} {TODAY.year}"

okr_objectives_rows = [
    {"id": 1, "title": "افزایش سهم بازار در دسته چای و دمنوش", "owner": "فروش", "quarter_label": CURRENT_QUARTER_LABEL, "sort_order": 1},
    {"id": 2, "title": "بهبود سلامت مالی و نقدینگی", "owner": "مالی", "quarter_label": CURRENT_QUARTER_LABEL, "sort_order": 2},
    {"id": 3, "title": "ارتقای رضایت و بهره‌وری پرسنل", "owner": "منابع انسانی", "quarter_label": CURRENT_QUARTER_LABEL, "sort_order": 3},
    {"id": 4, "title": "بهینه‌سازی زنجیره تأمین و موجودی", "owner": "انبار", "quarter_label": CURRENT_QUARTER_LABEL, "sort_order": 4},
]


def _kr(kr_id, objective_id, title, unit, target_value, actual_value, sort_order):
    progress_pct = round((actual_value / target_value) * 100.0, 1) if target_value else 0.0
    return {
        "id": kr_id, "objective_id": objective_id, "title": title, "unit": unit,
        "target_value": float(target_value), "actual_value": float(actual_value),
        "progress_pct": progress_pct, "sort_order": sort_order,
    }


okr_key_results_rows = [
    _kr(1, 1, "رشد فروش خالص نسبت به سال قبل", "٪", 18, round(random.uniform(9, 21), 1), 1),
    _kr(2, 1, "افزایش تعداد مشتریان فعال", "مشتری", 250, round(random.uniform(140, 260)), 2),
    _kr(3, 1, "راه‌اندازی خط دمنوش تی‌شاپ", "٪ پیشرفت", 100, round(random.uniform(55, 100)), 3),

    _kr(4, 2, "کاهش نسبت بدهی به دارایی به زیر ۴۵٪", "٪ (کمتر بهتر)", 45, round(random.uniform(42, 58), 1), 1),
    _kr(5, 2, "افزایش مانده نقدینگی", "میلیارد ریال", 900, round(random.uniform(500, 950)), 2),
    _kr(6, 2, "بهبود نرخ وصول مطالبات", "٪", 90, round(random.uniform(68, 91), 1), 3),

    _kr(7, 3, "کاهش نرخ ترک خدمت سالانه", "٪ (کمتر بهتر)", 8, round(random.uniform(6, 14), 1), 1),
    _kr(8, 3, "افزایش سرانه فروش هر ویزیتور", "٪ رشد", 12, round(random.uniform(4, 15), 1), 2),
    _kr(9, 3, "برگزاری دوره آموزشی پرسنل فروش", "٪ پیشرفت", 100, round(random.uniform(60, 100)), 3),

    _kr(10, 4, "کاهش سهم کالای راکد از کل موجودی", "٪ (کمتر بهتر)", 10, round(random.uniform(8, 19), 1), 1),
    _kr(11, 4, "افزایش دقت پیش‌بینی تقاضا", "٪", 90, round(random.uniform(72, 92), 1), 2),
    _kr(12, 4, "کاهش زمان تحویل سفارش", "روز (کمتر بهتر)", 5, round(random.uniform(3, 8), 1), 3),
]

# برای شاخص‌های «کمتر بهتر» (نسبت بدهی، ترک خدمت، کالای راکد، زمان تحویل)،
# پیشرفت را معکوس محاسبه می‌کنیم تا عملکرد بهتر از هدف همیشه به پیشرفت بالاتر
# ترجمه شود (نه برعکس، که با محاسبه‌ی ساده actual/target اتفاق می‌افتاد).
_LOWER_IS_BETTER_KR_IDS = {4, 7, 10, 12}
for kr in okr_key_results_rows:
    if kr["id"] in _LOWER_IS_BETTER_KR_IDS:
        target = kr["target_value"]
        actual = kr["actual_value"]
        kr["progress_pct"] = round(min(100.0, (target / actual) * 100.0), 1) if actual else 100.0

log(f"okr_objectives rows generated: {len(okr_objectives_rows)}, okr_key_results rows generated: {len(okr_key_results_rows)}")
print(f"okr rows: {len(okr_objectives_rows)} objectives, {len(okr_key_results_rows)} key results", file=sys.stderr)

# --------------------------------------------------------------------------
# Write everything to the 6 SQLite databases
# --------------------------------------------------------------------------

GENERATED_AT_JALALI = TODAY_STR


def write_db(filename, table_ddls, table_data, meta: dict):
    """table_ddls: dict[name] -> CREATE TABLE ddl (without trailing ;).
    table_data: dict[name] -> list[dict] (keys must match column order in ddl)."""
    path = os.path.join(OUT_DIR, filename)
    if os.path.exists(path):
        os.remove(path)
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("CREATE TABLE etl_meta (key TEXT PRIMARY KEY, value TEXT)")
    cur.executemany("INSERT INTO etl_meta (key, value) VALUES (?, ?)", list(meta.items()))

    for name, ddl in table_ddls.items():
        cur.execute(ddl)
        rows = table_data.get(name, [])
        if not rows:
            continue
        cols = list(rows[0].keys())
        placeholders = ",".join(["?"] * len(cols))
        col_list = ",".join(cols)
        cur.executemany(
            f"INSERT INTO {name} ({col_list}) VALUES ({placeholders})",
            [tuple(r[c] for c in cols) for r in rows],
        )
    conn.commit()
    conn.close()
    log(f"Wrote {filename}: " + ", ".join(f"{n}={len(table_data.get(n, []))}" for n in table_ddls))
    print(f"Wrote {filename}", file=sys.stderr)


# ---- sales.db ----
write_db(
    "sales.db",
    {
        "sales_lines": """
            CREATE TABLE sales_lines (
                record_source TEXT,
                invoice_type TEXT,
                item_code TEXT,
                item_name TEXT,
                unit_raw TEXT,
                qty_raw REAL,
                sales_center TEXT,
                customer_code TEXT,
                customer_name TEXT,
                canonical_customer_code TEXT,
                visitor_name TEXT,
                invoice_no TEXT,
                invoice_date_jalali TEXT,
                erp_base_unit_UNRELIABLE TEXT,
                erp_base_qty_UNRELIABLE REAL,
                erp_base_unit_price_UNRELIABLE REAL,
                unit_price REAL,
                amount REAL,
                vat_amount REAL,
                discount_amount REAL,
                sign INTEGER,
                net_amount REAL,
                unit_family TEXT,
                unit_conversion_ratio REAL,
                qty_normalized_count REAL,
                qty_normalized_kg REAL,
                qty_normalized_count_signed REAL,
                qty_normalized_kg_signed REAL,
                carton_size REAL,
                qty_normalized_carton_signed REAL,
                item_group TEXT,
                is_active_basket INTEGER,
                province TEXT
            )
        """,
    },
    {"sales_lines": sales_rows},
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "max_invoice_date": MAX_SALES_DATE,
        "row_count": str(len(sales_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- receivables.db ----
write_db(
    "receivables.db",
    {
        "receivable_invoices": """
            CREATE TABLE receivable_invoices (
                row_no TEXT, region TEXT, branch TEXT, province TEXT, customer_code TEXT,
                customer_name TEXT, customer_group TEXT, customer_total_debt REAL, invoice_no TEXT,
                invoice_kind TEXT, invoice_date_jalali TEXT, invoice_net_amount REAL, amount_paid REAL,
                amount_unpaid REAL, invoice_debt_age_days REAL, collection_delay_days REAL,
                collection_delay_days_secondary REAL, collection_delay_penalty REAL, visitor_name TEXT,
                source_file TEXT, source_sheet TEXT, invoice_year_jalali TEXT, invoice_month_jalali TEXT,
                invoice_year_month_jalali TEXT, due_bucket_15d TEXT, debt_age_bucket_detailed TEXT
            )
        """,
        "customer_dim": """
            CREATE TABLE customer_dim (
                row_no TEXT, customer_code TEXT, customer_name TEXT, customer_group TEXT,
                region TEXT, branch TEXT, province TEXT, customer_total_debt REAL
            )
        """,
    },
    {"receivable_invoices": receivable_rows, "customer_dim": customer_dim_rows},
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "max_invoice_date": max(r["invoice_date_jalali"] for r in receivable_rows),
        "row_count": str(len(receivable_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- pnl.db ----
write_db(
    "pnl.db",
    {
        "pnl_long": """
            CREATE TABLE pnl_long (
                row_no REAL, item TEXT, category TEXT, year_jalali REAL, month_num REAL,
                month_name TEXT, month_seq REAL, amount_rial REAL, amount_before_correction REAL,
                percent_of_net_sales REAL, source TEXT, note TEXT
            )
        """,
        "pnl_product_marketer_lines": """
            CREATE TABLE pnl_product_marketer_lines (
                invoice_no TEXT, invoice_date_jalali TEXT, item_code TEXT, item_name TEXT, unit TEXT,
                form_type TEXT, item_group TEXT, center_code TEXT, sales_center TEXT, customer_code TEXT,
                customer_name TEXT, employee_name TEXT, qty REAL, unit_price REAL, amount REAL,
                discount REAL, net_sales REAL, cost_unit_price REAL, cost_amount REAL, profit_loss REAL,
                profit_pct_1 REAL, profit_pct_2 REAL, shared_cost_share_17pct REAL,
                profit_loss_after_shared_cost REAL, profit_pct_after_shared_1 REAL,
                profit_pct_after_shared_2 REAL, is_active_basket REAL
            )
        """,
        "pnl_center_lines": """
            CREATE TABLE pnl_center_lines (
                sales_center TEXT, cost_amount REAL, gross_sales_before_returns REAL, discounts REAL,
                net_sales REAL, gross_profit REAL, gross_profit_pct REAL, headcount REAL,
                salary_total REAL, productivity_bonus_total REAL, incentive_bonus_total REAL,
                avg_personnel_salary REAL, rent_expense REAL, direct_expense REAL, mortgage_expense REAL,
                other_expense REAL, net_profit REAL, net_profit_pct REAL, discount_to_sales_ratio REAL,
                incentive_to_sales_ratio REAL, period_date TEXT
            )
        """,
    },
    {
        "pnl_long": pnl_long_rows,
        "pnl_product_marketer_lines": pnl_lines_rows,
        "pnl_center_lines": pnl_center_rows,
    },
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "max_month_seq": str(_pnl_month_seq - 1),
        "max_period": jstr(*_pnl_month_list[-1], 1),
        "row_count": str(len(pnl_long_rows) + len(pnl_lines_rows) + len(pnl_center_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- hr.db ----
write_db(
    "hr.db",
    {
        "personnel_records": """
            CREATE TABLE personnel_records (
                employee_name TEXT, personnel_code TEXT, hire_date_jalali TEXT, issue_date_jalali TEXT,
                effective_date_jalali TEXT, approval_date_jalali TEXT, employment_type TEXT,
                decree_type TEXT, position TEXT, org_unit TEXT, service_location TEXT, hire_year TEXT,
                issue_year TEXT, effective_year TEXT, approval_year TEXT
            )
        """,
        "headcount_by_month": """
            CREATE TABLE headcount_by_month (
                year_jalali INTEGER, month_num INTEGER, month_name TEXT, headcount INTEGER,
                PRIMARY KEY (year_jalali, month_num)
            )
        """,
        "employee_status": """
            CREATE TABLE employee_status (
                personnel_code TEXT PRIMARY KEY, employee_name TEXT, hire_year_jalali INTEGER,
                hire_month_num INTEGER, termination_year_jalali INTEGER, termination_month_num INTEGER
            )
        """,
        "salary_per_capita": """
            CREATE TABLE salary_per_capita (
                year_jalali INTEGER, month_num INTEGER, month_name TEXT, total_salary_cost_rial REAL,
                headcount INTEGER, salary_per_capita_rial REAL
            )
        """,
    },
    {
        "personnel_records": personnel_records_rows,
        "headcount_by_month": headcount_by_month_rows,
        "employee_status": employee_status_rows,
        "salary_per_capita": salary_per_capita_rows,
    },
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "row_count": str(len(personnel_records_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- targets.db ----
write_db(
    "targets.db",
    {
        "target_visitor": """
            CREATE TABLE target_visitor (
                visitor_name TEXT, item_group TEXT, year_jalali INTEGER, month_num INTEGER, target_qty REAL
            )
        """,
        "target_branch": """
            CREATE TABLE target_branch (
                branch_raw TEXT, line_raw TEXT, item_group TEXT, year_jalali INTEGER, month_num INTEGER,
                target_qty REAL
            )
        """,
    },
    {"target_visitor": target_visitor_rows, "target_branch": target_branch_rows},
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "row_count": str(len(target_visitor_rows) + len(target_branch_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- inventory.db ----
write_db(
    "inventory.db",
    {
        "inventory_lines": """
            CREATE TABLE inventory_lines (
                item_code TEXT, item_name TEXT, cost_center TEXT, warehouse_code TEXT,
                warehouse_name TEXT, on_hand_qty REAL, reserved_qty REAL, sellable_qty REAL
            )
        """,
    },
    {"inventory_lines": inventory_rows},
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "row_count": str(len(inventory_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# ---- finance.db ----
write_db(
    "finance.db",
    {
        "finance_monthly": """
            CREATE TABLE finance_monthly (
                year_jalali INTEGER, month_num INTEGER, month_name TEXT, month_seq INTEGER,
                total_assets_rial REAL, total_liabilities_rial REAL, cash_balance_rial REAL,
                company_value_rial REAL, budget_target_rial REAL, budget_actual_rial REAL, roi_pct REAL
            )
        """,
        "okr_objectives": """
            CREATE TABLE okr_objectives (
                id INTEGER PRIMARY KEY, title TEXT, owner TEXT, quarter_label TEXT, sort_order INTEGER
            )
        """,
        "okr_key_results": """
            CREATE TABLE okr_key_results (
                id INTEGER PRIMARY KEY, objective_id INTEGER, title TEXT, unit TEXT,
                target_value REAL, actual_value REAL, progress_pct REAL, sort_order INTEGER
            )
        """,
    },
    {
        "finance_monthly": finance_monthly_rows,
        "okr_objectives": okr_objectives_rows,
        "okr_key_results": okr_key_results_rows,
    },
    {
        "generated_at_jalali": GENERATED_AT_JALALI,
        "row_count": str(len(finance_monthly_rows) + len(okr_objectives_rows) + len(okr_key_results_rows)),
        "source": "demo/fake-data/generate.py (synthetic data)",
    },
)

# --------------------------------------------------------------------------
# Summary log (UTF-8 file - avoids Windows console codepage issues with Persian text)
# --------------------------------------------------------------------------

summary_path = os.path.join(SCRIPT_DIR, "generate_summary.log")
with io.open(summary_path, "w", encoding="utf-8") as f:
    f.write("\n".join(summary_lines) + "\n")

print("DONE. See generate_summary.log for full details.", file=sys.stderr)
