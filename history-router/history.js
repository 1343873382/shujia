export const createHistoryRouter = (baseUrl, routes) => {
    export default class Base {
        constructor(router) {
            this.router = router

            this.current = createRoute(null, {
                path: '/'
            })
        }

        transitionTo(location, onComplete) {

            let route = this.router.match(location)

            if (this.current.path === location && route.matched.length === this.current.matched.length) return

            this.updateRoute(route)
            onComplete && onComplete()
        }

        updateRoute(route) {
            this.current = route
            this.cb && this.cb(route)
        }

        linsten(cb) {
            this.cb = cb
        }
    }


}