'use strict';

describe("Downloads with 'dlgrab.my.to' and 'test.com' excluded", function () {

	var options = {
		"overrideDlDialog": true,
		"playMediaInBrowser": true,
		"dlListSize": "20",
		"grabFilesLargerThanMB": "0",
		"excludeWebFiles": true,
		"excludedExts": "",
		"includedExts": "bin",
		"forcedExts": "",
		"blacklistDomains": "dlgrab.my.to, test.com",
		"defaultDM": ""
	}

	initApp(options);
	

	describe("direct bin from dlgrab.my.to", function () {
		let dlInfo = REQ.direct_bin;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});

	describe("direct bin from test.com", function () {
		let dlInfo = REQ.direct_bin_test_dotcom;
		let action = req(dlInfo);
		it("is grabbed", function () {
			expect(action).toEqual(ReqFilter.ACT_IGNORE);
		});
	});



});