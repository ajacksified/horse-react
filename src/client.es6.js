import React from 'react-dom';
import { ClientApp } from 'horse';

class ClientReactApp extends ClientApp {
  constructor (props={}) {
    super(props);

    if (props.mountPoint) {
      this.mountPoint = props.mountPoint;
    }

    if (window.bootstrap) {
      this.resetState(window.bootstrap);
    }

    this.redirect = this.redirect.bind(this);
  }

  redirect (status, path) {
    if ((typeof status === 'string') && !path) {
      path = status;
    }

    this.render(path);
  }

  buildContext (href) {
    const request = this.buildRequest(href);

    // `this` binding, how does it work
    return {
      ...request,
      request,
      req: request,
      redirect: this.redirect,
      error: this.error,
    };
  }

  async render (href, firstLoad, modifyContext) {
    let mountPoint = this.mountPoint;

    if (!mountPoint) {
      throw new Error(
        'Please define a `mountPoint` on your ClientApp for the react element to render to.'
      );
    }

    let ctx = this.buildContext(href);

    if (modifyContext) {
      ctx = modifyContext(ctx);
    }

    if (firstLoad) {
      ctx.props = this.getState();
    }

    await this.route(ctx);

    try {
      React.render(ctx.body, mountPoint);
    } catch (e) {
      console.log(e);
      //this.error(e, ctx, this);
    }

    return Promise.resolve(ctx);
  }
}

export default ClientReactApp;
