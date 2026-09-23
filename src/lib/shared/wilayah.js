/**
 * 24 kabupaten/kota di Sulawesi Selatan. `pusat` = koordinat kasar ibu kota,
 * dipakai untuk bias pencarian Maps dan titik cadangan. Batas wilayah yang akurat
 * ada di pipeline/config/kabkota.geojson (OSM).
 * @typedef {{ slug: string, nama: string, tipe: 'kota' | 'kabupaten', pusat: [number, number], alias: string[] }} KabKota
 */

/** @type {KabKota[]} */
export const KABKOTA = [
	{
		slug: 'makassar',
		nama: 'Kota Makassar',
		tipe: 'kota',
		pusat: [-5.1477, 119.4327],
		alias: ['makassar', 'ujung pandang']
	},
	{
		slug: 'parepare',
		nama: 'Kota Parepare',
		tipe: 'kota',
		pusat: [-4.0135, 119.6255],
		alias: ['parepare', 'pare-pare', 'pare pare']
	},
	{
		slug: 'palopo',
		nama: 'Kota Palopo',
		tipe: 'kota',
		pusat: [-2.9925, 120.1969],
		alias: ['palopo']
	},
	{
		slug: 'gowa',
		nama: 'Kabupaten Gowa',
		tipe: 'kabupaten',
		pusat: [-5.2066, 119.4538],
		alias: ['gowa', 'sungguminasa']
	},
	{
		slug: 'maros',
		nama: 'Kabupaten Maros',
		tipe: 'kabupaten',
		pusat: [-5.006, 119.573],
		alias: ['maros', 'turikale']
	},
	{
		slug: 'takalar',
		nama: 'Kabupaten Takalar',
		tipe: 'kabupaten',
		pusat: [-5.418, 119.49],
		alias: ['takalar', 'pattallassang']
	},
	{
		slug: 'pangkep',
		nama: 'Kabupaten Pangkajene dan Kepulauan',
		tipe: 'kabupaten',
		pusat: [-4.826, 119.553],
		alias: ['pangkajene dan kepulauan', 'pangkep']
	},
	{
		slug: 'barru',
		nama: 'Kabupaten Barru',
		tipe: 'kabupaten',
		pusat: [-4.4125, 119.6225],
		alias: ['barru']
	},
	{
		slug: 'bone',
		nama: 'Kabupaten Bone',
		tipe: 'kabupaten',
		pusat: [-4.5386, 120.3279],
		alias: ['bone', 'watampone']
	},
	{
		slug: 'soppeng',
		nama: 'Kabupaten Soppeng',
		tipe: 'kabupaten',
		pusat: [-4.353, 119.884],
		alias: ['soppeng', 'watansoppeng']
	},
	{
		slug: 'wajo',
		nama: 'Kabupaten Wajo',
		tipe: 'kabupaten',
		pusat: [-4.133, 120.027],
		alias: ['wajo', 'sengkang']
	},
	{
		slug: 'sidrap',
		nama: 'Kabupaten Sidenreng Rappang',
		tipe: 'kabupaten',
		pusat: [-3.917, 119.789],
		alias: ['sidenreng rappang', 'sidrap']
	},
	{
		slug: 'pinrang',
		nama: 'Kabupaten Pinrang',
		tipe: 'kabupaten',
		pusat: [-3.788, 119.652],
		alias: ['pinrang']
	},
	{
		slug: 'enrekang',
		nama: 'Kabupaten Enrekang',
		tipe: 'kabupaten',
		pusat: [-3.563, 119.771],
		alias: ['enrekang']
	},
	{
		slug: 'tana-toraja',
		nama: 'Kabupaten Tana Toraja',
		tipe: 'kabupaten',
		pusat: [-3.1, 119.852],
		alias: ['tana toraja', 'makale']
	},
	{
		slug: 'toraja-utara',
		nama: 'Kabupaten Toraja Utara',
		tipe: 'kabupaten',
		pusat: [-2.97, 119.899],
		alias: ['toraja utara', 'rantepao']
	},
	{
		slug: 'luwu',
		nama: 'Kabupaten Luwu',
		tipe: 'kabupaten',
		pusat: [-3.397, 120.37],
		alias: ['luwu', 'belopa']
	},
	{
		slug: 'luwu-utara',
		nama: 'Kabupaten Luwu Utara',
		tipe: 'kabupaten',
		pusat: [-2.554, 120.329],
		alias: ['luwu utara', 'masamba']
	},
	{
		slug: 'luwu-timur',
		nama: 'Kabupaten Luwu Timur',
		tipe: 'kabupaten',
		pusat: [-2.636, 121.088],
		alias: ['luwu timur', 'malili', 'sorowako']
	},
	{
		slug: 'sinjai',
		nama: 'Kabupaten Sinjai',
		tipe: 'kabupaten',
		pusat: [-5.123, 120.253],
		alias: ['sinjai']
	},
	{
		slug: 'bulukumba',
		nama: 'Kabupaten Bulukumba',
		tipe: 'kabupaten',
		pusat: [-5.557, 120.195],
		alias: ['bulukumba']
	},
	{
		slug: 'bantaeng',
		nama: 'Kabupaten Bantaeng',
		tipe: 'kabupaten',
		pusat: [-5.545, 119.946],
		alias: ['bantaeng']
	},
	{
		slug: 'jeneponto',
		nama: 'Kabupaten Jeneponto',
		tipe: 'kabupaten',
		pusat: [-5.677, 119.733],
		alias: ['jeneponto', 'bontosunggu']
	},
	{
		slug: 'selayar',
		nama: 'Kabupaten Kepulauan Selayar',
		tipe: 'kabupaten',
		pusat: [-6.12, 120.46],
		alias: ['kepulauan selayar', 'selayar', 'benteng selayar']
	}
];

/** @type {Map<string, KabKota>} */
const BY_SLUG = new Map(KABKOTA.map((k) => [k.slug, k]));

/**
 * @param {string | null | undefined} slug
 * @returns {KabKota | undefined}
 */
export function kabkotaBySlug(slug) {
	return slug ? BY_SLUG.get(slug) : undefined;
}

/**
 * Nama pendek untuk UI ("Makassar", "Gowa").
 * @param {string | null | undefined} slug
 */
export function kabkotaLabel(slug) {
	const k = kabkotaBySlug(slug);
	return k ? k.nama.replace(/^(Kota|Kabupaten) /, '') : '';
}

/**
 * Tebak kab/kota dari teks alamat. Alias terpanjang dicocokkan lebih dulu supaya
 * "Luwu Timur" tidak terbaca sebagai "Luwu".
 * @param {string | null | undefined} alamat
 * @returns {string | null}
 */
export function kabkotaFromText(alamat) {
	if (!alamat) return null;
	const text = ` ${alamat.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
	const pairs = KABKOTA.flatMap((k) =>
		k.alias.map((a) => /** @type {[string, string]} */ ([a, k.slug]))
	);
	pairs.sort((a, b) => b[0].length - a[0].length);
	for (const [alias, slug] of pairs) {
		const needle = ` ${alias.replace(/[^a-z0-9]+/g, ' ')} `;
		if (text.includes(needle)) return slug;
	}
	return null;
}

/** Kotak batas kasar Sulsel [minLat, minLng, maxLat, maxLng], termasuk pulau Pangkep & Selayar. */
export const SULSEL_BBOX = /** @type {const} */ ([-7.9, 116.8, -1.8, 122.3]);
