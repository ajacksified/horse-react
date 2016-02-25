import React from 'react';
import ReactDOM from 'react-dom/server';
import { App } from 'horse';

class ServerReactApp extends App {
  async injectBootstrap (ctx, format) {
    ctx.props.timings = ctx.timings;

    let p = Object.assign({}, ctx.props);

    if (format) {
      p = format(p);
    }

    delete p.app;
    delete p.api;
    delete p.manifest;
    p.data = {};

    let bootstrap = ServerReactApp.safeStringify(p);

    let body = ctx.body;
    let bodyIndex = body.lastIndexOf('</body>');
    let template = `<script>let bootstrap=${bootstrap}</script>`;
    ctx.body = body.slice(0, bodyIndex) + template + body.slice(bodyIndex);
  }

  async render (ctx) {
    if (typeof ctx.body === 'function') {
      let Layout = ctx.layout;
      let props = ctx.props;
      ctx.type = 'text/html; charset=utf-8';

      try {
        if (ctx.staticMarkup) {
          let layout = ReactDOM.renderToStaticMarkup(<Layout {...props } />);
          let body = ReactDOM.renderToString(ctx.body(props));

          ctx.body = layout.replace(/!!CONTENT!!/, body);
        } else {
          ctx.body = ReactDOM.renderToStaticMarkup(
            <Layout {...props}>
              { ctx.body(props) }
            </Layout>
          );
        }
      } catch (e) {
        ctx.props.app.error(e, ctx, ctx.props.app);
        await ctx.props.app.render(ctx);
      }
    }
  }

  async loadData(ctx) {
    // ctx.props.data is a map; pass in its keys as an array of promises
    if (ctx.props.data) {
      return Promise.all([...ctx.props.data.values()]);
    } else {
      return Promise.resolve();
    }
  }

  static safeStringify (obj) {
    return JSON.stringify(obj)
      .replace(/&/g, '\\u0026')
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E');
  }

  static serverRender (app, formatProps) {
    return async function (ctx) {
      ctx.timings = {};

      if (ctx.accepts('html')) {
        let routeStart = Date.now();
        await app.route(ctx);
        ctx.timings.route = Date.now() - routeStart;
      }

      if (typeof ctx.body === 'function') {
        // Load all the data required for the request before the server renders
        let data;
        ctx.props = ctx.props || {};

        try {
          let dataStart = Date.now();
          data = await app.loadData(ctx);
          ctx.timings.data = Date.now() - dataStart;
        } catch (e) {
          app.error(e, ctx, app);
        }

        ctx.props.dataCache = {};

        if (data) {
          // The entries are in the same order as when we fired off the promises;
          // load the data from the response array.
          let i = 0;
          for (let [key] of ctx.props.data.entries()) {
            ctx.props.dataCache[key] = data[i];
            i++;
          }
        }

        if (ctx.preServerRender) {
          const preServerRender = ctx.preServerRender(ctx);

          // If you explicitly return `false`, don't continue the render.
          if (preServerRender === false) {
            return;
          }
        }

        let renderStart = Date.now();
        await app.render(ctx);
        ctx.timings.render = Date.now() - renderStart;

        if (formatProps) {
          ctx.props = formatProps(ctx.props);
        }

        await app.injectBootstrap(ctx, app.config.formatBootstrap);
      }
    };
  }
}

export default ServerReactApp;
