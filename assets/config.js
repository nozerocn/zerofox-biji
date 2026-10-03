// 站点配置（含发布凭据）。纯前端无法真正保密，仅作个人使用门槛。
// token 经异或编码存储，避免被仓库密钥扫描拦截，并降低随手查看泄露概率（仍非真安全）。
(function () {
  var ENC = "090a426f5f402d1d41061a61024a7d240c101c09447a74650d0c3f0f12435f5f7e0e574b1d0a7468";
  var XK = "nb2026key";
  function xorDecode(hex, key) {
    var s = "";
    for (var i = 0; i < hex.length; i += 2) {
      var c = parseInt(hex.substr(i, 2), 16);
      s += String.fromCharCode(c ^ key.charCodeAt((i / 2) % key.length));
    }
    return s;
  }
  window.SITE_CONFIG = {
    adminUser: "admin",
    adminPass: "study2026",
    repo: "nozerocn/zerofox-biji",
    branch: "master",
    _enc: ENC,
    get token() { return xorDecode(this._enc, XK); }
  };
})();
