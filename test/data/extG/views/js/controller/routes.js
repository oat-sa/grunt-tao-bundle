define(['extG/controller/a', 'extG/controller/b'], function (ctrlA, ctrlB) {
  'use strict';
  const router = {
      '/a': ctrlA,
      '/b': ctrlB
  }

  return router;
});