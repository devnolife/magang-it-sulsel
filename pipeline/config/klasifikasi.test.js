import { describe, expect, it } from 'vitest';
import { jenisDariNama, namaIsp, putusan, skorAturan, skorNama } from './klasifikasi.js';

/**
 * @param {string} nama
 * @param {string[]} kategori
 * @param {Partial<import('./klasifikasi.js').KandidatAturan>} [extra]
 */
const nilai = (nama, kategori, extra = {}) => {
	const r = skorAturan({ nama, kategori, ...extra });
	return { ...r, putusan: putusan(r.skor) };
};

describe('skorAturan: masuk', () => {
	it('software house, konsultan, dan ISP berbadan usaha', () => {
		expect(nilai('PT Flash Informatika Cemerlang', ['Konsultan Komputer'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'konsultan'
		});
		expect(nilai('Kodeka Labs (PT.Kodeka Digital Raya)', ['Perusahaan Software'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'software'
		});
		expect(nilai('PT. Sutera Network Indonesia', ['Penyedia Layanan Internet'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'isp'
		});
	});

	it('nama kuat cukup walau kategori netral; jenis dari nama', () => {
		expect(nilai('wanHEX Software House', ['Kantor Perusahaan'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'software'
		});
		expect(nilai('Sai Cowork Makassar', ['Agen Sewa Ruangan Eksekutif'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'startup'
		});
	});

	it('Diskominfo/BPS berkategori pemerintah menjadi instansi', () => {
		expect(nilai('Dinas Kominfo Maros', ['Kantor Pemerintah'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'instansi',
			skor: 6
		});
		expect(nilai('Kantor BPS Kab. Kepulauan Selayar', ['Kantor Pemerintah']).jenis).toBe(
			'instansi'
		);
	});

	it('coworking asli di kategori Ruang Kerja Bersama', () => {
		expect(nilai('5.0 Coworking Space Ratulangi', ['Ruang Kerja Bersama'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'startup'
		});
	});

	it('"klinik IT" bukan klinik kesehatan', () => {
		expect(nilai('Klinik Konsultasi IT AIMP', ['Konsultan Komputer']).putusan).toBe('masuk');
	});
});

describe('skorAturan: buang', () => {
	it('RT/RW net, konter, dan menara di kategori ISP', () => {
		for (const nama of ['Warnet Barokah', 'Arya Cell', 'Tower BTS Desa Bontoa', 'Sinar Net']) {
			expect(nilai(nama, ['Penyedia Layanan Internet']).putusan, nama).toBe('buang');
		}
		expect(
			nilai('XL Home Makassar Wi-Fi (Daftar Baru)', ['Penyedia Layanan Internet'], {
				jumlah_ulasan: 40
			}).putusan
		).toBe('buang');
	});

	it('gerai telko tetap dibuang walau punya website', () => {
		expect(
			nilai('GraPARI Makassar', ['Penyedia Layanan Telekomunikasi'], {
				website: 'https://www.telkomsel.com'
			}).putusan
		).toBe('buang');
		expect(nilai('Telkom STO Pangkep', ['Penyedia Layanan Telekomunikasi']).putusan).toBe('buang');
		for (const nama of [
			'3KiosK Parepare Pusat Distribusi & Layanan Resmi Tri',
			'Service Point Smartfren Urip Sumohardjo Makasar',
			'XL Center Makassar (XL Satu | AXIS)',
			'Indosat Griya Bulukumba',
			'Telkom Wifi Corner'
		]) {
			expect(
				nilai(nama, ['Penyedia Layanan Telekomunikasi'], { jumlah_ulasan: 400 }).putusan,
				nama
			).toBe('buang');
		}
		expect(
			nilai('MSC KIMA INDOSAT Makassar', ['Penyedia Layanan Telekomunikasi'], {
				website: 'http://indosatooredoo.com/'
			}).putusan
		).toBe('masuk');
	});

	it('kategori web hosting: jasa website → software, penyedia hosting → isp', () => {
		expect(nilai('Jasa Pembuatan Website Makassar Terbaik', ['Layanan Web Hosting'])).toMatchObject(
			{ putusan: 'masuk', jenis: 'software' }
		);
		expect(nilai('Rumahweb Hosting Makassar', ['Layanan Web Hosting'])).toMatchObject({
			putusan: 'masuk',
			jenis: 'isp'
		});
	});

	it('kantor pemerintah non-IT, sekretariat, toko, dan kursus', () => {
		expect(nilai('Kantor Bupati Barru', ['Kantor Pemerintah']).putusan).toBe('buang');
		expect(nilai('SEKRET KARANG TARUNA', ['Ruang Kerja Bersama']).putusan).toBe('buang');
		expect(nilai('Makassar Computindo - Toko Komputer', ['Toko Komputer']).putusan).toBe('buang');
		expect(nilai('Kursus Komputer Cerdas', ['Pusat pelatihan']).putusan).toBe('buang');
		expect(nilai('Mulya Group', ['Agen Pemasaran'])).toMatchObject({
			putusan: 'buang',
			jenis: 'agency'
		});
	});
});

describe('skorAturan: ragu (diteruskan ke AI)', () => {
	it('sinyal campuran', () => {
		expect(nilai('PT Docotel Teknologi Celebes', ['Kantor Perusahaan'])).toMatchObject({
			putusan: 'ragu',
			jenis: 'software'
		});
		expect(nilai('Code Pixel Academy', ['Perancang Situs Web']).putusan).toBe('ragu');
		expect(nilai('Iskandar Komputer', ['Perusahaan Software']).putusan).toBe('ragu');
		expect(nilai('Qodrisoft', ['Kantor Perusahaan']).putusan).toBe('ragu');
	});

	it('teks website menaikkan kandidat netral ke ragu', () => {
		const k = { nama: 'Yuscorp Ecosystem', kategori: ['Kantor Perusahaan'] };
		expect(putusan(skorAturan(k).skor)).toBe('buang');
		const r = skorAturan(k, { judul: 'Yuscorp - Jasa Pembuatan Aplikasi & Website' });
		expect(r).toMatchObject({ skor: 2 });
		expect(r.alasan).toContain('website +2');
	});
});

describe('skorAturan: toko, agen, dan kategori ambigu', () => {
	it('"Layanan dan Dukungan Komputer" butuh sinyal nama; toko/ATK/sewa dibuang', () => {
		const kat = ['Layanan dan Dukungan Komputer'];
		expect(nilai('Sistekom', kat).putusan).toBe('ragu');
		expect(nilai('Kawauso Teknologi Indonesia', kat).putusan).toBe('masuk');
		expect(nilai('supplier smartphone', kat).putusan).toBe('buang');
		expect(nilai('MM. ZIQRI. A. ATK', kat).putusan).toBe('buang');
		expect(nilai('SEWA HT MAKASSAR GOWA', ['Kontraktor Telekomunikasi']).putusan).toBe('buang');
		expect(
			nilai('Internet Cafe M3', ['Penyedia Layanan Internet'], { jumlah_ulasan: 40 }).putusan
		).toBe('buang');
		expect(nilai('Gheo Tech Jual CCTV Canggih', ['Layanan Keamanan Komputer']).putusan).toBe(
			'ragu'
		);
	});

	it('nama ISP di kategori pemasaran internet diperlakukan seperti kategori ISP', () => {
		const kat = ['Layanan Pemasaran Internet'];
		expect(nilai('CBN', kat, { jumlah_ulasan: 25 })).toMatchObject({
			putusan: 'masuk',
			jenis: 'isp'
		});
		expect(nilai('DzaliqaNET', kat)).toMatchObject({ putusan: 'buang', jenis: 'isp' });
		expect(
			nilai('ICONNet Makassar | TEAM INTERNETFIBERINDO - SMART', kat, { jumlah_ulasan: 33 }).putusan
		).toBe('buang');
		expect(nilai('Moodlab - Digital Marketing Agency', kat)).toMatchObject({
			putusan: 'masuk',
			jenis: 'agency'
		});
		expect(nilai('Jasa Internet Marketing Makassar', kat).jenis).toBe('agency');
		expect(
			nilai('Wifi my republic', ['Perusahaan jaringan bisnis'], { jumlah_ulasan: 16 })
		).toMatchObject({ putusan: 'masuk', jenis: 'isp' });
		expect(nilai('PT. BASIC (PERSERODA)', ['Perusahaan jaringan bisnis']).putusan).toBe('ragu');
	});

	it('nama satu huruf tidak informatif', () => {
		expect(nilai('H', ['Kontraktor Telekomunikasi'])).toMatchObject({
			putusan: 'buang',
			alasan: ['nama tidak informatif −10']
		});
	});
});

describe('helper', () => {
	it('namaIsp mengenali merek & akhiran "net", bukan internet marketing', () => {
		expect(
			['Lena Net', 'DzaliqaNET', 'Iconnet PLN Maros', 'Wifi my republic'].map(namaIsp)
		).toEqual([true, true, true, true]);
		expect(['Planet Digital', 'Jasa Internet Marketing', 'Pionir Network'].map(namaIsp)).toEqual([
			false,
			false,
			false
		]);
	});

	it('skorNama membatasi positif +6 dan negatif -8', () => {
		expect(skorNama('Software Development Digital Technology Solutions').skor).toBe(6);
		expect(skorNama('Toko Servis Cell Pulsa').skor).toBe(-8);
	});

	it('akhiran "tek" tidak dianggap merek teknologi', () => {
		expect(skorNama('Arsitek Nusantara').skor).toBe(0);
	});

	it('jenisDariNama & putusan ambang', () => {
		expect(jenisDariNama('Biznet Networks')).toBe('isp');
		expect(jenisDariNama('CBN Makassar')).toBe('isp');
		expect(jenisDariNama('Teras Digital Kreatif')).toBe('agency');
		expect(jenisDariNama('PT. Liny Jaya Informatika')).toBe('software');
		expect(jenisDariNama('Mulya Group')).toBeNull();
		expect([putusan(4), putusan(3), putusan(1), putusan(0), putusan(-5)]).toEqual([
			'masuk',
			'ragu',
			'ragu',
			'buang',
			'buang'
		]);
	});
});
