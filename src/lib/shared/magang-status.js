/**
 * @typedef {'lowongan' | 'halaman-karir' | 'kurasi' | 'pengalaman'} TipeBukti
 * @typedef {{ tipe: TipeBukti, url?: string | null, kutipan?: string | null, tanggal?: string | null }} BuktiMagang
 * @typedef {'terbukti' | 'indikasi' | 'belum'} StatusMagang
 */

/** @type {Record<StatusMagang, { label: string, short: string, keterangan: string }>} */
export const MAGANG_STATUS = {
	terbukti: {
		label: 'Terbukti menerima magang',
		short: 'Terbukti magang',
		keterangan:
			'Ada cerita magang mahasiswa yang sudah diperiksa pengelola, atau lowongan magang yang pernah dibuka.'
	},
	indikasi: {
		label: 'Ada indikasi menerima magang',
		short: 'Indikasi magang',
		keterangan: 'Halaman karir atau catatan kurasi menyebut program magang/PKL/internship.'
	},
	belum: {
		label: 'Belum diketahui',
		short: 'Belum diketahui',
		keterangan: 'Belum ada bukti. Tanyakan langsung lewat kontak yang tersedia.'
	}
};

/** @type {StatusMagang[]} */
export const MAGANG_STATUS_KEYS = ['terbukti', 'indikasi', 'belum'];

/** Kata yang menandakan magang di halaman karir / judul lowongan. */
export const MAGANG_RE =
	/\b(magang|internship|intern|interns|pkl|prakerin|praktik kerja( lapangan)?|praktek kerja( lapangan)?|kerja praktek|kerja praktik|mbkm|studi independen)\b/i;

/**
 * @param {{ bukti?: BuktiMagang[] | null, jumlahPengalaman?: number, jumlahLowongan?: number }} input
 * @returns {StatusMagang}
 */
export function deriveMagangStatus({ bukti, jumlahPengalaman = 0, jumlahLowongan = 0 }) {
	const list = bukti || [];
	if (jumlahPengalaman > 0 || jumlahLowongan > 0) return 'terbukti';
	if (list.some((b) => b.tipe === 'lowongan' || b.tipe === 'pengalaman')) return 'terbukti';
	if (list.some((b) => b.tipe === 'halaman-karir' || b.tipe === 'kurasi')) return 'indikasi';
	return 'belum';
}
