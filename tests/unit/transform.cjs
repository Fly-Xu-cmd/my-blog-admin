const ts = require('typescript');
module.exports = {
  process(source, file) {
    return {
      code: ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: file,
      }).outputText,
    };
  },
};
