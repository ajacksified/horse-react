import React from 'react';
import ReactDOM from 'react-dom/server';
import { App } from 'horse';

class ServerReactApp extends App {
  async injectBootstrap (ctx, format) {
    let p = { ...ctx.props };

    if (format) {
      p = format({...ctx.props});
    }

    delete p.app;
    delete p.api;
    delete p.manifest;
    delete p.dataPromises;

    const bootstrap = ServerReactApp.safeStringify(p);

    const body = ctx.body;
    const bodyIndex = body.lastIndexOf('</body>');
    const template = `<script>window.bootstrap=${bootstrap}</script>`;
    ctx.body = body.slice(0, bodyIndex) + template + body.slice(bodyIndex);
  }

  async render (ctx) {
    //todo figure out html template
    ctx.type = 'text/html; charset=utf-8';

    try {
      if (React.isValidElement(ctx.body)) {
        let body = ReactDOM.renderToStaticMarkup(ctx.body);
        ctx.body = body;//layout.replace(/!!CONTENT!!/, body);
      }
    } catch (e) {
      ctx.props.app.error(e, ctx, ctx.props.app);
      await ctx.props.app.render(ctx);
    }
  }

  static safeStringify (obj) {
    return JSON.stringify(obj)
      .replace(/&/g, '\\u0026')
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E');
  }

  static serverRender (app) {
    return async function (ctx, next) {
      ctx.timings = {};

      if (ctx.accepts('html')) {
        let routeStart = Date.now();
        await app.route(ctx, next);
        ctx.timings.route = Date.now() - routeStart;
      }

      let renderStart = Date.now();
      await app.render(ctx);
      ctx.timings.render = Date.now() - renderStart;

      console.log(app.config.formatBootstrap);
      await app.injectBootstrap(ctx, app.config.formatBootstrap);
    };
  }
}

export default ServerReactApp;
