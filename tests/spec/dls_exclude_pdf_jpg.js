'use strict';

describe("Downloads pdf and jpg excluded and ignore web file to false and display in browser to false and pdf and jpg also forced and included", function () {

	var options = {
		"overrideDlDialog": true,
		"playMediaInBrowser": false,
		"dlListSize": "20",
		"grabFilesLargerThanMB": "0",
		"excludeWebFiles": false,
		"excludedExts": "pdf, jpg",
		"includedExts": "pdf, jpg",
		"forcedExts": " jpg, pdf ",
		"blacklistDomains": "",
		"defaultDM": ""
	}

	initApp(options);
	

	describe("direct bin file", function () {
		let dlInfo = REQ.direct_bin;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("direct unknown file type", function () {
		let dlInfo = REQ.direct_asdf;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);		
		});
	});

	describe("direct script", function () {
		let dlInfo = REQ.direct_js;
		let action = req(dlInfo);
		it("is ignored", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB_SILENT);
		});
	});

	describe("direct image", function () {
		let dlInfo = REQ.direct_jpg;
		let action = req(dlInfo);
		it("is ignored", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});

	describe("direct text", function () {
		let dlInfo = REQ.direct_txt;
		let action = req(dlInfo);
		it("is silent grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("direct pdf", function () {
		let dlInfo = REQ.direct_pdf;
		let action = req(dlInfo);
		it("is silent grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});

	describe("direct mp4", function () {
		let dlInfo = REQ.direct_mp4;
		let action = req(dlInfo);
		it("is silent grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("direct audio", function () {
		let dlInfo = REQ.direct_mp3;
		let action = req(dlInfo);
		it("is silent grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("attachment bin file", function () {
		let dlInfo = REQ.attch_bin;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);		
		});
	});

	describe("attachment unknown file type", function () {
		let dlInfo = REQ.attch_asdf;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("attachment script", function () {
		let dlInfo = REQ.attch_js;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("attachment image", function () {
		let dlInfo = REQ.attch_jpg;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});

	describe("attachment text", function () {
		let dlInfo = REQ.attch_txt;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("attachment pdf", function () {
		let dlInfo = REQ.attch_pdf;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});

	describe("attachment mp4", function () {
		let dlInfo = REQ.attch_mp4;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

	describe("attachment audio", function () {
		let dlInfo = REQ.attch_mp3;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_GRAB);
		});
	});

});