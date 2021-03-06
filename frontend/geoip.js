+function(factory) {
  if (typeof define === 'function' && define.amd) {
    define('nytint-geoip', [], factory);
  } else {
    window.nytint_geoip = factory();
  }
}(function() {
  'use strict';

  var key = 'nyt-geoip',
      dom = document.getElementsByTagName('html'),
      //flag
      already_processed = false,
      //geoip response properties to promote
      property_whitelist = [
        'continent_code',
        'country_code',
        'region',
        'dma_code',
        'postal_code',
        'time_zone',
        'zone_abbr'
      ];

  var fetch = function(callback) {
    var ajax_req = new XMLHttpRequest(),
        stored_data = null,
        ajax_data = null;
    //if local|sessionStorage, use it & get out early
    try {
      stored_data = JSON.parse(sessionStorage.getItem(key));
      if (stored_data && stored_data.country_code !== undefined) {
        decorate(stored_data, callback);
        //return geoip response either way, for semi-API behavior
        return stored_data;
      }
    } catch(e) { /*console.warn('no sessionStorage');*/ }

    //otherwise, return XHR request results (not using jQuery on purpose)
    //success case
    ajax_req.onload = function(e) {
      if (!e.target) { return false; } //nullcheck
      ajax_data = parse_response(e.target);
      if (typeof ajax_data === 'undefined') { return false;} //nullcheck
      decorate(ajax_data, callback);
      //return geoip response either way, for semi-API behavior
      return ajax_data;
    };
    //error case
    ajax_req.onreadystatechange = function () {
      if (ajax_req.readyState === 4 /*done*/ && ajax_req.status !== 200 /*success*/) { 
        console.error(ajax_req.status);
      }
    };
    //execution
    ajax_req.open('GET', 'https://geoip.newsdev.nytimes.com/', true);
    try {
      ajax_req.responseType = 'json';
    } catch(e) { /*older safari instances doesn't like this*/ }
    ajax_req.send();
  };

  var parse_response = function (xhr) {
    var data = null;
    switch (true) {
      //modern browsers
      case (xhr.responseType === 'json'): //latest
        data = xhr.response.data;
        break;
      //IEs
      case (xhr.response !== null): //IE latest
        data = JSON.parse(xhr.response).data;
        break;
      case (xhr.responseText !== null): //IE old (minor case)
        data = JSON.parse(xhr.responseText).message
        break;
    };
    //one more nullcheck
    return (data !== undefined) ? data : null;
  };

  var decorate = function(geo_data, callback) {
    //nullcheck
    if (!dom) { /*console.warn('<html> is missing. Fun!');*/ return false; }
    
    //store
    try {
      sessionStorage.setItem(key, JSON.stringify(geo_data));
    } catch(e) { 
      /*console.warn('no sessionStorage available');*/ 
    }
    
    //data-attr decorate html tag
    if (geo_data !== undefined && !already_processed) {
      for (var i = 0, prop; prop = property_whitelist[i]; i++) {
        if (geo_data[prop] !== undefined) {
          var classed = ['geo', prop_clean(prop), geo_data[prop]].join('-');
          dom[0].classList.add(classed);
        }
      }
      already_processed = true;
    }

    //call callback, if included
    if (typeof callback === 'function') {
      callback(geo_data);
    }

    return geo_data;
  };

  var prop_clean = function(prop) {
    var cleaned = prop;
    switch (true) {
      case (prop.indexOf('zone_abbr') >= 0): cleaned = prop.replace('zone_abbr','us-timezone'); break;
      case (prop.indexOf('_zone') >= 0): cleaned = prop.replace('_zone','zone'); break;
      case (prop.indexOf('_code') >= 0): cleaned = prop.replace('_code',''); break;
    }
    return cleaned;
  };

  if (!window.NYTINT_TESTING) { fetch(); }

  return fetch;
});