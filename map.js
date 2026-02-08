import { cityAssets, asiaAssets, countryCodes, imgMeta } from './data-assets.js';

window.imgMeta = imgMeta;   // ← 加这一行


/* ====== 直辖市+特别行政区：点击后直接展图，不下钻 ====== */
const DIRECT_CITIES = new Set(['北京市', '上海市', '重庆市', '天津市', '香港特别行政区', '澳门特别行政区']);

/* ====== 中国底图专用：本地 geoJSON 编码表 ====== */
let chinaLocalAdcode = {};   // name -> adcode
function buildChinaMapping(geo) {
    geo.features.forEach(f => {
        const name = f.properties.name; cityAssetscityAssets
        const code = f.properties.adcode;   // 如果是 id 字段就换成 f.properties.id.slice(0,6)
        if (name && code) chinaLocalAdcode[name] = code;
    });
}

/* ----------  热力色阶 ---------- */
const HEAT_COLORS = {
    zero: [230, 95, 95],   // hsl(230,95%,95%) 极浅
    max: [230, 100, 26]     // hsl(230,100%,26%) 最深
};
function hslStr(h, s, l) { return `hsl(${h},${s}%,${l}%)` }

/* 把 0-n 映射到 0-1 */
function norm(count, max) { return max ? Math.min(count / max, 1) : 0 }

/* 线性插值 */
function lerpColor(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t)
    ];
}








function updateStats(mapName) {

    const isAsia = currentLevel === LEVEL_ASIA;
    const isChina = mapName === 'china';

    console.log('[updateStats] mapName =', mapName, 'currentLevel =', currentLevel);
    console.log('[updateStats] isAsia =', isAsia, 'isChina =', isChina);

    const statsTitle = document.getElementById('stats-title');
    const litLabel = document.getElementById('lit-label');
    const totalLabel = document.getElementById('total-label');
    const litCount = document.getElementById('lit-count');
    const totalCount = document.getElementById('total-count');
    const rate = document.getElementById('rate');

    /* 1. 亚洲视图 */
    if (isAsia) {
        statsTitle.textContent = '亚洲统计';
        litLabel.textContent = '已点亮国家：';
        totalLabel.textContent = '总国家数：';

        const allCountries = Object.keys(countryCodes);

        const litCountries = allCountries.filter(c => {
            const node = asiaAssets[c];
            const has = node && (Array.isArray(node) ? node.length : Object.keys(node).length);
            log('[updateStats-Asia]', c, 'hasAsset ->', has);
            return has;
        });

        litCount.textContent = litCountries.length;
        totalCount.textContent = allCountries.length;
        rate.textContent = allCountries.length
            ? (litCountries.length / allCountries.length * 100).toFixed(1) + '%'
            : '0%';
        return;
    }

    /* 2. 中国视图 */
    if (isChina) {
        statsTitle.textContent = '中国统计';
        litLabel.textContent = '已点亮省份：';
        totalLabel.textContent = '总省份数：';

        let lit = 0, total = 0;
        Object.keys(provinceCodes).forEach(p => {
            total++;
            if (provinceHasAsset(p)) lit++;
        });
        litCount.textContent = lit;
        totalCount.textContent = total;
        rate.textContent = total ? (lit / total * 100).toFixed(1) + '%' : '0%';
        return;
    }

    /* 3. 省级视图 */
    const provinceName = mapName;
    statsTitle.textContent = provinceName + ' 统计';
    litLabel.textContent = '已点亮城市：';
    totalLabel.textContent = '总城市数：';

    /* 3. 省级视图 → 以 geoJSON 里实际出现的 Feature 为准 */
    const cities = echarts.getMap(mapName).geoJson.features
        .map(f => f.properties.name);
    const litCityCnt = cities.filter(c => hasAsset(c)).length;

    litCount.textContent = litCityCnt;
    totalCount.textContent = cities.length;
    rate.textContent = cities.length
        ? (litCityCnt / cities.length * 100).toFixed(1) + '%'
        : '0%';
}

// 城市映射表（与前面一致）
const cityMapping = {
    "北京市": ["北京市"], "天津市": ["天津市"], "上海市": ["上海市"], "重庆市": ["重庆市"],
    "河北省": ["石家庄市", "唐山市", "秦皇岛市", "邯郸市", "邢台市", "保定市", "张家口市", "承德市", "沧州市", "廊坊市", "衡水市"],
    "山西省": ["太原市", "大同市", "阳泉市", "长治市", "晋城市", "朔州市", "晋中市", "运城市", "忻州市", "临汾市", "吕梁市"],
    "内蒙古自治区": ["呼和浩特市", "包头市", "乌海市", "赤峰市", "通辽市", "鄂尔多斯市", "呼伦贝尔市", "巴彦淖尔市", "乌兰察布市"],
    "辽宁省": ["沈阳市", "大连市", "鞍山市", "抚顺市", "本溪市", "丹东市", "锦州市", "营口市", "阜新市", "辽阳市", "盘锦市", "铁岭市", "朝阳市", "葫芦岛市"],
    "吉林省": ["长春市", "吉林市", "四平市", "辽源市", "通化市", "白山市", "松原市", "白城市"],
    "黑龙江省": ["哈尔滨市", "齐齐哈尔市", "鸡西市", "鹤岗市", "双鸭山市", "大庆市", "伊春市", "佳木斯市", "七台河市", "牡丹江市", "黑河市", "绥化市"],
    "江苏省": ["南京市", "无锡市", "徐州市", "常州市", "苏州市", "南通市", "连云港市", "淮安市", "盐城市", "扬州市", "镇江市", "泰州市", "宿迁市"],
    "浙江省": ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "绍兴市", "金华市", "衢州市", "舟山市", "台州市", "丽水市"],
    "安徽省": ["合肥市", "芜湖市", "蚌埠市", "淮南市", "马鞍山市", "淮北市", "铜陵市", "安庆市", "黄山市", "滁州市", "阜阳市", "宿州市", "六安市", "亳州市", "池州市", "宣城市"],
    "福建省": ["福州市", "厦门市", "莆田市", "三明市", "泉州市", "漳州市", "南平市", "龙岩市", "宁德市"],
    "江西省": ["南昌市", "景德镇市", "萍乡市", "九江市", "新余市", "鹰潭市", "赣州市", "吉安市", "宜春市", "抚州市", "上饶市"],
    "山东省": ["济南市", "青岛市", "淄博市", "枣庄市", "东营市", "烟台市", "潍坊市", "济宁市", "泰安市", "威海市", "日照市", "临沂市", "德州市", "聊城市", "滨州市", "菏泽市"],
    "河南省": ["郑州市", "开封市", "洛阳市", "平顶山市", "安阳市", "鹤壁市", "新乡市", "焦作市", "濮阳市", "许昌市", "漯河市", "三门峡市", "南阳市", "商丘市", "信阳市", "周口市", "驻马店市"],
    "湖北省": ["武汉市", "黄石市", "十堰市", "宜昌市", "襄阳市", "鄂州市", "荆门市", "孝感市", "荆州市", "黄冈市", "咸宁市", "随州市"],
    "湖南省": ["长沙市", "株洲市", "湘潭市", "衡阳市", "邵阳市", "岳阳市", "常德市", "张家界市", "益阳市", "郴州市", "永州市", "怀化市", "娄底市"],
    "广东省": ["广州市", "韶关市", "深圳市", "珠海市", "汕头市", "佛山市", "江门市", "湛江市", "茂名市", "肇庆市", "惠州市", "梅州市", "汕尾市", "河源市", "阳江市", "清远市", "东莞市", "中山市", "潮州市", "揭阳市", "云浮市"],
    "广西壮族自治区": ["南宁市", "柳州市", "桂林市", "梧州市", "北海市", "防城港市", "钦州市", "贵港市", "玉林市", "百色市", "贺州市", "河池市", "来宾市", "崇左市"],
    "海南省": ["海口市", "三亚市", "三沙市", "儋州市"],
    "四川省": ["成都市", "自贡市", "攀枝花市", "泸州市", "德阳市", "绵阳市", "广元市", "遂宁市", "内江市", "乐山市", "南充市", "眉山市", "宜宾市", "广安市", "达州市", "雅安市", "巴中市", "资阳市"],
    "贵州省": ["贵阳市", "六盘水市", "遵义市", "安顺市", "毕节市", "铜仁市"],
    "云南省": ["昆明市", "曲靖市", "玉溪市", "保山市", "昭通市", "丽江市", "普洱市", "临沧市"],
    "西藏自治区": ["拉萨市", "日喀则市", "昌都市", "林芝市", "山南市", "那曲市"],
    "陕西省": ["西安市", "铜川市", "宝鸡市", "咸阳市", "渭南市", "延安市", "汉中市", "榆林市", "安康市", "商洛市"],
    "甘肃省": ["兰州市", "嘉峪关市", "金昌市", "白银市", "天水市", "武威市", "张掖市", "平凉市", "酒泉市", "庆阳市", "定西市", "陇南市"],
    "青海省": ["西宁市", "海东市"],
    "宁夏回族自治区": ["银川市", "石嘴山市", "吴忠市", "固原市", "中卫市"],
    "新疆维吾尔自治区": ["乌鲁木齐市", "克拉玛依市", "吐鲁番市", "哈密市"],
    "台湾省": ["台北市", "新北市", "桃园市", "台中市", "台南市", "高雄市"],
    "香港特别行政区": ["香港特别行政区"],
    "澳门特别行政区": ["澳门特别行政区"]
};







const DEBUG = 1;
function log(...args) { }


/* =================  工具：判断亚洲国家是否有图  ================= */
/* === 新增：判断亚洲国家下某城市是否有图 === */
function cityHasAsset(country, city) {
    const node = asiaAssets[country];
    if (!node) return false;
    // 如果是旧格式（数组）直接返回长度
    if (Array.isArray(node)) return node.length;
    // 新格式：对象，key=城市
    return node[city] && node[city].length;
}


/* --------------  视图级别常量  -------------- */
const LEVEL_ASIA = 'asia';
const LEVEL_CHINA = 'china';
let currentLevel = LEVEL_ASIA;   // 初始一定是亚洲

/* --------------  按钮文字映射  -------------- */
const BACK_TEXT = {
    [LEVEL_ASIA]: '',          // 亚洲视图不显示按钮
    [LEVEL_CHINA]: '返回亚洲地图',
    province: '返回中国地图'   // 省市统一用这一句话
};

/* =================  更新按钮  ================= */
function updateBackBtn() {
    const btn = document.getElementById('back-btn');
    const txt = BACK_TEXT[currentLevel];
    if (!txt) {
        btn.style.display = 'none';

    } else {
        btn.style.display = 'block';
        btn.textContent = txt;

    }
}


function loadAsiaMap() {
    currentLevel = LEVEL_ASIA;
    updateBackBtn();
    fetch('asia.json')
        .then(r => r.json())
        .then(geo => {
            // ----- 关键修复：把英文 name 改成中文 -----
            const nameEn2Cn = {
                'China': '中国',
                'Japan': '日本',
                'South Korea': '韩国',
                'Thailand': '泰国',
                'Vietnam': '越南',
                'Malaysia': '马来西亚',
                'Singapore': '新加坡',
                'Indonesia': '印度尼西亚',
                'Philippines': '菲律宾',
                'India': '印度',
                'Pakistan': '巴基斯坦',
                'Bangladesh': '孟加拉国',
                'Sri Lanka': '斯里兰卡',
                'Kazakhstan': '哈萨克斯坦',
                'Uzbekistan': '乌兹别克斯坦',
                'Saudi Arabia': '沙特阿拉伯',
                'Turkey': '土耳其',
                'Iran': '伊朗',
                'Iraq': '伊拉克',
                'United Arab Emirates': '阿联酋',
                'Israel': '以色列',
                'Jordan': '约旦',
                'Lebanon': '黎巴嫩',
                'Syria': '叙利亚',
                'Yemen': '也门',
                'Oman': '阿曼',
                'Qatar': '卡塔尔',
                'Kuwait': '科威特',
                'Bahrain': '巴林',
                'Mongolia': '蒙古',
                'North Korea': '朝鲜',
                'Afghanistan': '阿富汗',
                'Nepal': '尼泊尔',
                'Bhutan': '不丹',
                'Maldives': '马尔代夫',
                'Kyrgyzstan': '吉尔吉斯斯坦',
                'Tajikistan': '塔吉克斯坦',
                'Turkmenistan': '土库曼斯坦',
                'Azerbaijan': '阿塞拜疆',
                'Armenia': '亚美尼亚',
                'Georgia': '格鲁吉亚',
                'Cyprus': '塞浦路斯',
                'Laos': '老挝',
                'Taiwan': '中国台湾',
                'Cambodia': '柬埔寨',
                'Myanmar': '缅甸'
            };

            geo.features.forEach(f => {
                const en = f.properties.name || f.properties.NAME;
                if (nameEn2Cn[en]) f.properties.name = nameEn2Cn[en];
            });

            echarts.registerMap('asia', geo);
            currentLevel = LEVEL_ASIA;
            updateBackBtn();
            renderAsiaChart([90, 30], 2.2);

        })
        .catch(err => { console.error(err); alert('亚洲地图加载失败'); });
    updateStats('asia');
}


function renderAsiaChart(center, zoom) {
    const regions = Object.keys(countryCodes)

        .filter(name => {
            const node = asiaAssets[name];
            const ok = node && (Array.isArray(node) ? node.length : Object.keys(node).length);
            return ok;               // 其余国家看 asiaAssets
        })
        .map(name => ({
            name,
            itemStyle: { areaColor: '#003d82' },
            emphasis: { itemStyle: { areaColor: '#002750' } }
        }));

    const option = {
        title: { text: '亚洲地图（点击国家进入）', left: 'center', top: 20, textStyle: { color: '#000' } },
        tooltip: { trigger: 'item', formatter: '{b}' },
        geo: {
            map: 'asia',
            roam: true,
            center: center,
            zoom: zoom,
            scaleLimit: { min: 0.6, max: 20 },
            label: { show: true, color: '#000' },
            itemStyle: { areaColor: '#fff', borderColor: '#444', borderWidth: 1 },
            emphasis: { label: { color: '#000' }, itemStyle: { areaColor: '#ffe033' } },
            regions
        },
        series: []
    };
    chart.setOption(option, true);
    backBtn.style.display = 'none';   // 最顶级，不显示返回
}


/* 工具：判断有无资源 */
function hasAsset(name) {
    const node = cityAssets[name];
    if (!node) return false;
    // 新格式：景点对象
    if (typeof node === 'object' && !Array.isArray(node)) {
        return Object.values(node).some(arr => arr && arr.length);
    }
    // 老格式
    return node.length;
}

/* === 新增：判断省份/城市是否有资源 === */
function provinceHasAsset(provName) {
    // 省内只要有一个城市有图就返回 true
    const mapping = {
        // 直辖市 (4个)
        "北京市": ["北京市"],
        "天津市": ["天津市"],
        "上海市": ["上海市"],
        "重庆市": ["重庆市"],

        // 河北省
        "河北省": ["石家庄市", "唐山市", "秦皇岛市", "邯郸市", "邢台市", "保定市", "张家口市", "承德市", "沧州市", "廊坊市", "衡水市"],

        // 山西省
        "山西省": ["太原市", "大同市", "阳泉市", "长治市", "晋城市", "朔州市", "晋中市", "运城市", "忻州市", "临汾市", "吕梁市"],

        // 内蒙古自治区
        "内蒙古自治区": ["呼和浩特市", "包头市", "乌海市", "赤峰市", "通辽市", "鄂尔多斯市", "呼伦贝尔市", "巴彦淖尔市", "乌兰察布市"],

        // 辽宁省
        "辽宁省": ["沈阳市", "大连市", "鞍山市", "抚顺市", "本溪市", "丹东市", "锦州市", "营口市", "阜新市", "辽阳市", "盘锦市", "铁岭市", "朝阳市", "葫芦岛市"],

        // 吉林省
        "吉林省": ["长春市", "吉林市", "四平市", "辽源市", "通化市", "白山市", "松原市", "白城市"],

        // 黑龙江省
        "黑龙江省": ["哈尔滨市", "齐齐哈尔市", "鸡西市", "鹤岗市", "双鸭山市", "大庆市", "伊春市", "佳木斯市", "七台河市", "牡丹江市", "黑河市", "绥化市"],

        // 江苏省
        "江苏省": ["南京市", "无锡市", "徐州市", "常州市", "苏州市", "南通市", "连云港市", "淮安市", "盐城市", "扬州市", "镇江市", "泰州市", "宿迁市"],

        // 浙江省
        "浙江省": ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "绍兴市", "金华市", "衢州市", "舟山市", "台州市", "丽水市"],

        // 安徽省
        "安徽省": ["合肥市", "芜湖市", "蚌埠市", "淮南市", "马鞍山市", "淮北市", "铜陵市", "安庆市", "黄山市", "滁州市", "阜阳市", "宿州市", "六安市", "亳州市", "池州市", "宣城市"],

        // 福建省
        "福建省": ["福州市", "厦门市", "莆田市", "三明市", "泉州市", "漳州市", "南平市", "龙岩市", "宁德市"],

        // 江西省
        "江西省": ["南昌市", "景德镇市", "萍乡市", "九江市", "新余市", "鹰潭市", "赣州市", "吉安市", "宜春市", "抚州市", "上饶市"],

        // 山东省
        "山东省": ["济南市", "青岛市", "淄博市", "枣庄市", "东营市", "烟台市", "潍坊市", "济宁市", "泰安市", "威海市", "日照市", "临沂市", "德州市", "聊城市", "滨州市", "菏泽市"],

        // 河南省
        "河南省": ["郑州市", "开封市", "洛阳市", "平顶山市", "安阳市", "鹤壁市", "新乡市", "焦作市", "濮阳市", "许昌市", "漯河市", "三门峡市", "南阳市", "商丘市", "信阳市", "周口市", "驻马店市"],

        // 湖北省
        "湖北省": ["武汉市", "黄石市", "十堰市", "宜昌市", "襄阳市", "鄂州市", "荆门市", "孝感市", "荆州市", "黄冈市", "咸宁市", "随州市"],

        // 湖南省
        "湖南省": ["长沙市", "株洲市", "湘潭市", "衡阳市", "邵阳市", "岳阳市", "常德市", "张家界市", "益阳市", "郴州市", "永州市", "怀化市", "娄底市"],

        // 广东省
        "广东省": ["广州市", "韶关市", "深圳市", "珠海市", "汕头市", "佛山市", "江门市", "湛江市", "茂名市", "肇庆市", "惠州市", "梅州市", "汕尾市", "河源市", "阳江市", "清远市", "东莞市", "中山市", "潮州市", "揭阳市", "云浮市"],

        // 广西壮族自治区
        "广西壮族自治区": ["南宁市", "柳州市", "桂林市", "梧州市", "北海市", "防城港市", "钦州市", "贵港市", "玉林市", "百色市", "贺州市", "河池市", "来宾市", "崇左市"],

        // 海南省
        "海南省": ["海口市", "三亚市", "三沙市", "儋州市"],

        // 四川省
        "四川省": ["成都市", "自贡市", "攀枝花市", "泸州市", "德阳市", "绵阳市", "广元市", "遂宁市", "内江市", "乐山市", "南充市", "眉山市", "宜宾市", "广安市", "达州市", "雅安市", "巴中市", "资阳市", "阿坝藏族羌族自治州", "甘孜藏族自治州", "凉山彝族自治州"],

        // 贵州省
        "贵州省": ["贵阳市", "六盘水市", "遵义市", "安顺市", "毕节市", "铜仁市"],

        // 云南省
        "云南省": ["昆明市", "曲靖市", "玉溪市", "保山市", "昭通市", "丽江市", "普洱市", "临沧市"],

        // 西藏自治区
        "西藏自治区": ["拉萨市", "日喀则市", "昌都市", "林芝市", "山南市", "那曲市"],

        // 陕西省
        "陕西省": ["西安市", "铜川市", "宝鸡市", "咸阳市", "渭南市", "延安市", "汉中市", "榆林市", "安康市", "商洛市"],

        // 甘肃省
        "甘肃省": ["兰州市", "嘉峪关市", "金昌市", "白银市", "天水市", "武威市", "张掖市", "平凉市", "酒泉市", "庆阳市", "定西市", "陇南市"],

        // 青海省
        "青海省": [
            "西宁市",
            "海东市",
            "海北藏族自治州",
            "黄南藏族自治州",
            "海南藏族自治州",
            "果洛藏族自治州",
            "玉树藏族自治州",
            "海西蒙古族藏族自治州"
        ],

        // 宁夏回族自治区
        "宁夏回族自治区": ["银川市", "石嘴山市", "吴忠市", "固原市", "中卫市"],

        // 新疆维吾尔自治区
        "新疆维吾尔自治区": ["乌鲁木齐市", "克拉玛依市", "吐鲁番市", "哈密市"],

        "台湾省": ["台北市", "新北市", "桃园市", "台中市", "台南市", "高雄市"],
        "香港特别行政区": ["香港特别行政区"],
        "澳门特别行政区": ["澳门特别行政区"]
    };
    const cities = mapping[provName] || [];
    const hit = cities.some(c => cityAssets[c] && cityAssets[c].length);
    return hit;
}

const chart = echarts.init(document.getElementById('main'));
const backBtn = document.getElementById('back-btn');
const provinceCodes = {
    "北京市": "110000", "天津市": "120000", "河北省": "130000", "山西省": "140000",
    "内蒙古自治区": "150000", "辽宁省": "210000", "吉林省": "220000", "黑龙江省": "230000",
    "上海市": "310000", "江苏省": "320000", "浙江省": "330000", "安徽省": "340000",
    "福建省": "350000", "江西省": "360000", "山东省": "370000", "河南省": "410000",
    "湖北省": "420000", "湖南省": "430000", "广东省": "440000", "广西壮族自治区": "450000",
    "海南省": "460000", "重庆市": "500000", "四川省": "510000", "贵州省": "520000",
    "云南省": "530000", "西藏自治区": "540000", "陕西省": "610000", "甘肃省": "620000",
    "青海省": "630000", "宁夏回族自治区": "640000", "新疆维吾尔自治区": "650000",
    "台湾": "710000", "香港特别行政区": "810000", "澳门特别行政区": "820000"
};

loadAsiaMap();



function loadMap(adcode, mapName) {
    // ① 中国底图
    // ① 中国底图 - 使用阿里云 DataV 在线数据源
    if (adcode === '100000') {
        fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
            .then(r => r.json())
            .then(g => {
                echarts.registerMap('china', g);
                currentLevel = LEVEL_CHINA;
                updateBackBtn(); updateStats('china');
                renderChart('china', [104, 36], 1.2);
            }).catch(err => alert('中国地图加载失败'));
        return;
    }

    // ② 省/市底图 → 优先本地，没有再 DataV
    const localUrl = `/geo/province/${adcode}_full.json`;
    const datavUrl = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`;

    fetch(localUrl)
        .then(r => { if (!r.ok) throw new Error('本地无文件'); return r.json(); })
        .catch(() => fetch(datavUrl).then(r => r.json())) // 回退
        .then(geo => {
            const cleaned = turf.featureCollection(
                geo.features.filter(f => turf.area(f) / 1e6 > 0.1)
            );
            const box = turf.bbox(cleaned);
            const center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
            const w = turf.distance([box[0], center[1]], [box[2], center[1]]);
            const zoom = Math.floor(8 - Math.log2(w / 360 * Math.PI * 2));
            echarts.registerMap(mapName, cleaned);
            currentLevel = 'province';
            updateBackBtn(); updateStats(mapName);
            renderChart(mapName, center, zoom);
        })
        .catch(err => { console.error(err); alert('地图加载失败'); });
}

/* =================  四档热力色阶 ================= */
function heatColor(count) {
    if (count === 0) return '#ffffff';   // 0 张保持地图白
    if (count < 5) return '#b4d2f2ff';   // 1-4 张
    if (count < 10) return '#4d9fff';   // 5-9 张
    if (count < 20) return '#1a6fe0';   // 10-19 张
    return '#003d82';                    // ≥20 张 最深
}

/* 通用：拿资源长度（兼容旧数组/新对象） */
function getLen(node) {
    if (!node) return 0;
    if (Array.isArray(node)) return node.length;
    return Object.values(node).reduce((s, arr) => s + (arr ? arr.length : 0), 0);
}

/* =================  完整 renderChart ================= */
function renderChart(mapName, center, zoom) {
    console.log('[renderChart] 进入 -> mapName=', mapName);
    /* ---------- 港澳别名修正 ---------- */
    const specialMap = {
        '香港特别行政区': '香港',
        '澳门特别行政区': '澳门'
    };

    const isCountry = mapName === 'china';
    const isProvince = provinceCodes[mapName];   // 省码存在 ⇒ 是省
    const isCity = !isCountry && !isProvince; // 否则是市

    /* ---------- 1. 计算当前层级“最大照片数” ---------- */
    let maxCount = 0;
    if (isCountry) {
        Object.keys(provinceCodes).forEach(p => {
            const cities = cityMapping[p] || [];
            const sum = cities.reduce((s, c) => s + getLen(cityAssets[c]), 0);
            if (sum > maxCount) maxCount = sum;
        });
    } else if (isProvince) {
        const cities = cityMapping[mapName] || [];
        cities.forEach(c => {
            const n = getLen(cityAssets[c]);
            if (n > maxCount) maxCount = n;
        });
    } else {
        const feats = echarts.getMap(mapName).geoJson.features;
        feats.forEach(f => {
            const n = getLen(cityAssets[f.properties.name]);
            if (n > maxCount) maxCount = n;
        });
    }

    /* ---------- 2. 生成 regions（染色） ---------- */
    let regions = [];
    if (isCountry) {
        console.log('[renderChart] 全国染色开始');
        Object.keys(provinceCodes).forEach(pName => {
            const cities = cityMapping[pName] || [];
            const count = cities.reduce((s, c) => s + getLen(cityAssets[c]), 0);
            if (count === 0) return; // 0 张保持默认白色
            regions.push({
                name: pName,
                itemStyle: { areaColor: heatColor(count) },
                emphasis: { itemStyle: { areaColor: '#002750' } }
            });
        });
    } else if (isProvince) {
        const features = echarts.getMap(mapName).geoJson.features;
        regions = features.map(f => {
            const name = f.properties.name;
            const count = getLen(cityAssets[name]);
            return count
                ? { name, itemStyle: { areaColor: heatColor(count) }, emphasis: { itemStyle: { areaColor: '#002750' } } }
                : { name };
        });
    } else { // 市
        const features = echarts.getMap(mapName).geoJson.features;
        regions = features.map(f => {
            const name = f.properties.name;
            const count = getLen(cityAssets[name]);
            return count
                ? { name, itemStyle: { areaColor: heatColor(count) }, emphasis: { itemStyle: { areaColor: '#002750' } } }
                : { name };
        });
    }

    /* ---------- 3. 拼装 option ---------- */
    const option = {
        title: {
            text: mapName === 'china' ? '中国地图（点击下钻）' : mapName + '地图',
            left: 'center',
            top: 20,
            textStyle: { color: '#000' }
        },
        tooltip: { trigger: 'item', formatter: '{b}' },
        geo: {
            map: mapName,
            roam: true,
            center: center,
            zoom: zoom,
            scaleLimit: { min: 0.6, max: 20 },
            label: { show: true, color: '#000' },
            itemStyle: { areaColor: '#fff', borderColor: '#444', borderWidth: 1 },
            emphasis: { label: { color: '#000' }, itemStyle: { areaColor: '#ffe033' } },
            regions: regions
        },
        series: []
    };

    chart.setOption(option, true);
    backBtn.style.display = isProvince ? 'block' : backBtn.style.display;
    updateStats(mapName);
}












/* --------------  返回按钮点击  -------------- */
backBtn.onclick = () => {
    if (currentLevel === 'province') {
        loadMap('100000', 'china');
    } else if (currentLevel === LEVEL_CHINA) {
        loadAsiaMap();
    } else { }
};
chart.on('click', params => {
    const name = params.name;

    /* -------- 亚洲级别单独处理 -------- */
    if (currentLevel === LEVEL_ASIA) {
        if (name === '中国') {
            loadMap('100000', 'china');
            return;
        }
        const country = asiaAssets[name];
        if (!country) {
            alert(`暂无“${name}”的媒体资源`);
            return;
        }
        if (!Array.isArray(country)) {          // 对象格式 => 有城市
            showAsiaCityPicker(name, country);
            return;
        }
        showDrawer(country);
        return;
    }

    /* ====== 直辖单元直接展图 ====== */
    if (DIRECT_CITIES.has(name)) {
        if (hasAsset(name)) {
            showDrawer(cityAssets[name], true);
        } else {
            alert(`暂无“${name}”的媒体资源`);
        }
        return;
    }

    /* ====== 省码命中 => 进入省级地图 ====== */
    const code = provinceCodes[name];
    if (code) {
        loadMap(code, name);
        return;
    }

    /* ====== 省级地图：城市点击 ====== */
    if (currentLevel === 'province') {
        const cityRes = cityAssets[name];
        if (hasAsset(name)) {          // 统一用 hasAsset 判断
            showDrawer(cityRes, true);   // true=隐藏返回按钮
        } else {
            alert(`暂无“${name}”的媒体资源`);
        }
        return;
    }

    /* ====== 其余（市地图等）老逻辑 ====== */
    if (hasAsset(name)) {
        showDrawer(cityAssets[name], true);
    } else {
        alert(`暂无“${name}”的媒体资源`);
    }
});


window.onresize = () => chart.resize();

/*************  抽屉 + 放大弹窗  *************/
/* 创建抽屉 DOM（仅首次调用时生成） */
/* 创建抽屉 DOM（仅首次调用时生成） */
function ensureDrawer() {
    if (document.querySelector('.city-drawer')) {
        return;
    }

    const drawer = document.createElement('div');
    drawer.className = 'city-drawer';
    // 注意：这里只插入骨架，不再 innerHTML 整个覆盖
    drawer.innerHTML = `
    <div class="drawer-mask"></div>
    <div class="drawer-body">
      <div class="drawer-header">
        <span class="drawer-title">城市相册</span>
        <span class="drawer-close">&times;</span>
      </div>
      <div class="drawer-content"></div>
    </div>`;
    document.body.appendChild(drawer);

    // 再插入“返回城市选择”按钮（此时 drawer-body 已存在）
    const backBtn = document.createElement('button');
    backBtn.className = 'back-to-city';
    backBtn.textContent = '↩ 返回城市选择';
    backBtn.style.cssText = 'margin:0 16px 12px;display:none;cursor:pointer;';
    drawer.querySelector('.drawer-header').after(backBtn);

    /* 点击事件：关闭相册 → 打开城市选择 */
    backBtn.onclick = () => {
        if (window._lastAsiaCountry) {
            hideDrawer();
            showAsiaCityPicker(window._lastAsiaCountry, asiaAssets[window._lastAsiaCountry]);
        }
    };

    // 关闭事件
    drawer.querySelector('.drawer-close').onclick = hideDrawer;
    drawer.querySelector('.drawer-mask').onclick = hideDrawer;
}

/* 展示抽屉 */
/* 2. 只填充内容 + 控制按钮显隐 */
function showDrawer(listOrObj, isCityPicker = false) {
    ensureDrawer();

    const drawer = document.querySelector('.city-drawer');
    const content = drawer.querySelector('.drawer-content');
    const backBtn = drawer.querySelector('.back-to-city');
    const header = drawer.querySelector('.drawer-title');

    backBtn.style.display = isCityPicker ? 'none' : 'inline-block';
    content.innerHTML = '';

    /* 1. 对象格式 => 直接平铺分类 */
    if (typeof listOrObj === 'object' && !Array.isArray(listOrObj)) {
        header.textContent = '城市相册';
        Object.entries(listOrObj).forEach(([spot, arr]) => {
            if (!arr || !arr.length) return;
            // 小标题
            const tit = document.createElement('div');
            tit.style.cssText = 'font-size:18px;font-weight:600;padding:10px 0;color:#333;display:flex;align-items:center;gap:6px;';
            tit.innerHTML = '📍' + spot;

            content.appendChild(tit);
            // 照片
            arr.forEach(src => {
                const isVid = /(mp4|mov|webm|ogg|m4v|3gp)$/i.test(src);
                const card = document.createElement('div');
                card.className = 'media-card';
                card.innerHTML = isVid
                    ? `<video muted controls preload="metadata" style="width:100%;border-radius:6px;"><source src="${src}"></video>`
                    : `<img src="${src}" style="width:100%;border-radius:6px;cursor:zoom-in" onclick="showImageZoom('${src}')">`;
                content.appendChild(card);
            });
        });
        drawer.classList.add('show');
        return;
    }

    /* 2. 老数组格式 => 原逻辑不动 */
    header.textContent = '城市相册';
    listOrObj.forEach(rawUrl => {
        const isVid = /(mp4|mov|webm|ogg|m4v|3gp)$/i.test(rawUrl);
        const card = document.createElement('div');
        card.className = 'media-card';
        card.innerHTML = isVid
            ? `<video muted controls preload="metadata" style="width:100%;border-radius:6px;"><source src="${rawUrl}"></video>`
            : `<img src="${rawUrl}" style="width:100%;border-radius:6px;cursor:zoom-in" onclick="showImageZoom('${rawUrl}')">`;
        content.appendChild(card);
    });
    drawer.classList.add('show');
}

/* 关闭抽屉 */
function hideDrawer() {
    document.querySelector('.city-drawer').classList.remove('show');
    document.querySelectorAll('.drawer-content video').forEach(v => v.pause());
}


/* 保证弹窗 DOM 只创建一次（一行两栏版） */
function ensureZoomPanel() {
    if (document.querySelector('.img-zoom-wrap')) {
        log('DOM 已存在，跳过创建');
        return;
    }
    log('首次创建“一行两栏”放大弹窗 DOM');

    const wrap = document.createElement('div');
    wrap.className = 'img-zoom-wrap';
    wrap.innerHTML = `
    <div class="zoom-mask"></div>

    <!-- 整个内容区：一行两栏 -->
    <div class="zoom-box" style="display:flex; gap:20px; align-items:center; max-width:90vw; max-height:90vh;">

      <!-- 左侧：图片，最多占 50% 宽 -->
      <div class="zoom-img-box" style="flex:0 0 70%; display:flex; align-items:center; justify-content:center;">
        <img class="zoom-img" style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:6px;">
      </div>

      <!-- 右侧：信息面板 -->
      <div class="info-panel" style="flex:0 0 20%; background:#fff; border-left:4px solid #b20000; border-radius:0 8px 8px 0; padding:16px; font-size:14px; color:#333;">
        <div class="info-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-weight:600;">
          <span>照片信息</span>
        </div>
        <div class="info-body">
          <div class="info-item">
            <div class="info-label" style="color:#999; font-size:12px; margin-bottom:4px;">拍摄地点</div>
            <div class="info-val" id="info-location" style="margin-bottom:12px;"></div>
          </div>
          <div class="info-item">
            <div class="info-label" style="color:#999; font-size:12px; margin-bottom:4px;">拍摄时间</div>
            <div class="info-val" id="info-time" style="margin-bottom:12px;"></div>
          </div>
          <div class="info-item">
            <div class="info-label" style="color:#999; font-size:12px; margin-bottom:4px;">描述</div>
            <div class="info-val" id="info-desc"></div>
          </div>
        </div>
      </div>

      <!-- 关闭按钮：放在整个 box 右上角 -->
      <span class="zoom-close" style="position:absolute; top:12px; right:12px; font-size:24px; cursor:pointer; color:#666;">&times;</span>
    </div>`;

    document.body.appendChild(wrap);
    log('“一行两栏”弹窗 DOM 创建完成');
}

/* 点击任意图片触发 */
function showImageZoom(src) {
    log('showImageZoom -> src=', src);
    ensureZoomPanel();

    const wrap = document.querySelector('.img-zoom-wrap');
    const imgEl = wrap.querySelector('.zoom-img');
    const meta = window.imgMeta?.[src] || { location: '未知', time: '某年某月', desc: '随手拍' };

    log('读取到的 meta:', meta);

    /* 填信息面板 */
    wrap.querySelector('#info-location').textContent = meta.location;
    wrap.querySelector('#info-time').textContent = meta.time;
    wrap.querySelector('#info-desc').textContent = meta.desc;

    /* 换大图 */
    imgEl.src = src;
    log('图片 src 已设定');

    /* 显示最外层 */
    wrap.classList.add('show');
    log('弹窗已显示');

    /* 关闭逻辑 */
    const close = () => {
        log('关闭弹窗');
        wrap.classList.remove('show');
        imgEl.src = '';          // 释放内存
    };
    wrap.querySelector('.zoom-close').onclick = close;
    wrap.querySelector('.info-close').onclick = close;
    wrap.querySelector('.zoom-mask').onclick = close;
    document.addEventListener('keydown', e => e.key === 'Escape' && close(), { once: true });
}






/* === 亚洲国家-城市选择面板 === */
function showAsiaCityPicker(countryName, countryObj) {

    window._lastAsiaCountry = countryName;

    ensureDrawer();   // 保证壳已建
    const drawer = document.querySelector('.city-drawer');
    const header = drawer.querySelector('.drawer-title');
    const content = drawer.querySelector('.drawer-content');
    const backBtn = drawer.querySelector('.back-to-city');

    /* 关键：城市选择阶段强制隐藏返回按钮 */
    backBtn.style.display = 'none';

    header.textContent = `${countryName} · 选择城市`;
    content.innerHTML = '';

    Object.keys(countryObj).forEach(city => {
        const arr = countryObj[city];
        if (!arr || !arr.length) return;
        const card = document.createElement('div');
        card.className = 'media-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `<div style="padding:12px;font-size:15px;">📍 ${city}（${arr.length} 张）</div>`;
        card.onclick = () => {

            hideDrawer();
            showDrawer(arr, false);   // 进入相册，showDrawer 会把按钮再显示出来
        };
        content.appendChild(card);
    });

    drawer.classList.add('show');
}

/* === 中国城市-景点选择面板 === */
function showChinaSpotPicker(cityName, spotObj) {
    ensureDrawer();                       // 保证抽屉壳已建
    const drawer = document.querySelector('.city-drawer');
    const header = drawer.querySelector('.drawer-title');
    const content = drawer.querySelector('.drawer-content');
    const backBtn = drawer.querySelector('.back-to-city');

    backBtn.style.display = 'none';       // 景点选择阶段隐藏“返回”
    header.textContent = `${cityName} · 选择景点`;
    content.innerHTML = '';

    Object.keys(spotObj).forEach(spot => {
        const arr = spotObj[spot];
        if (!arr || !arr.length) return;
        const card = document.createElement('div');
        card.className = 'media-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `<div style="padding:12px;font-size:15px;">📍 ${spot}（${arr.length} 张）</div>`;
        card.onclick = () => {              // 进入该景点相册
            hideDrawer();
            showDrawer(arr, false);           // false=此时显示“↩返回景点选择”
        };
        content.appendChild(card);
    });

    drawer.classList.add('show');
}


/* 供 HTML 内联事件调用 */
/* 让内联事件能找到 showImageZoom */
window.showImageZoom = showImageZoom;