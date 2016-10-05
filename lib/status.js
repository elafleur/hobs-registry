'use strict';

module.exports = {
  errors: {
    dbConnect: 0,
    getPackageQuery: 0,
    updatePackageQuery: 0,
    searchPackageQuery: 0,
    createPackageQuery: 0,
    removePackageQuery: 0,
    allPackagesQuery: 0,
    getPackageListQuery: 0,
    badUrl: 0,
    badName: 0,
    notFound: 0,
    notAuthorized: 0,
    jwtVerification: 0,
    jwtBlacklist: 0,
    adduser: 0,
    other: 0
  },
  getPackage: 0,
  downloadPackage: 0,
  searchPackage: 0,
  createPackage: 0,
  removePackage: 0,
  allPackages: 0,
  getPackageList: 0,
  getPackageIndex: 0,
  started: +(new Date())
};
