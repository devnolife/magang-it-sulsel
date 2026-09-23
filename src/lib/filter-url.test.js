import { describe, expect, it } from 'vitest';
import {
	bacaJumlahTampil,
	jumlahFilterAktif,
	LANGKAH,
	queryDariForm,
	queryFilter
} from './filter-url.js';

describe('queryFilter', () => {
	it('membuang nilai bawaan', () => {
		expect(queryFilter({})).toBe('');
		expect(queryFilter({ q: '  ', urut: 'relevansi', lowongan: false })).toBe('');
	});

	it('urutan kunci tetap dan nilai jamak diulang', () => {
		expect(
			queryFilter({
				urut: 'nama',
				lowongan: true,
				magang: ['terbukti'],
				jenis: ['software', 'agency'],
				kab: ['makassar'],
				q: 'web'
			})
		).toBe('q=web&kab=makassar&jenis=software&jenis=agency&magang=terbukti&lowongan=1&urut=nama');
	});

	it('opsi n dan tanpaUrut', () => {
		expect(queryFilter({ jenis: ['isp'], urut: 'terdekat' }, { n: 60 })).toBe(
			'jenis=isp&urut=terdekat&n=60'
		);
		expect(queryFilter({ jenis: ['isp'], urut: 'terdekat' }, { tanpaUrut: true })).toBe(
			'jenis=isp'
		);
	});
});

describe('queryDariForm', () => {
	it('membaca FormData form saring', () => {
		const fd = new FormData();
		fd.set('q', ' aplikasi ');
		fd.append('jenis', 'software');
		fd.append('kab', 'gowa');
		fd.append('kab', 'maros');
		fd.set('urut', 'relevansi');
		expect(queryDariForm(fd)).toBe('q=aplikasi&kab=gowa&kab=maros&jenis=software');
	});
});

describe('jumlahFilterAktif', () => {
	it('menghitung setiap pilihan', () => {
		expect(jumlahFilterAktif({ q: '', kab: [], jenis: [], magang: [], lowongan: false })).toBe(0);
		expect(
			jumlahFilterAktif({ q: 'x', kab: ['a', 'b'], jenis: ['c'], magang: [], lowongan: true })
		).toBe(5);
	});
});

describe('bacaJumlahTampil', () => {
	it('bawaan LANGKAH untuk nilai kosong, rusak, atau terlalu kecil', () => {
		for (const v of [null, '', 'abc', '-5', '0', '12', '30']) {
			expect(bacaJumlahTampil(v)).toBe(LANGKAH);
		}
	});

	it('dibulatkan ke atas ke kelipatan LANGKAH dan dibatasi', () => {
		expect(bacaJumlahTampil('60')).toBe(60);
		expect(bacaJumlahTampil('61')).toBe(90);
		expect(bacaJumlahTampil('999999')).toBe(5000);
	});
});
