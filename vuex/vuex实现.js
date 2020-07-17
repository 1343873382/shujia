let Vue
const install = _Vue => {

    Vue = _Vue

    Vue.mixin({
        beforeCreate() {

            const options = this.$options
            if (options.store) {
                this.$store = typeof options.store === 'function' ? options.store() : options.store
            } else if (options.parent && options.parent.$store) {
                this.$store = options.parent.$store
            }
        }
    })
}
class Store {
    constructor(options = {}) {
        this.options = options

        this.getters = {}

        this.mutations = {}

        this.actions = {}

        this._modules = new moduleCollection(options)

        this.commit = (type, param) => {
            this.mutations[type].forEach(fn => fn(param))
        }
        this.dispatch = (type, param) => {
            this.actions[type].forEach(fn => fn(param))
        }
        const state = options.state;
        const path = [];
        installModule(this, state, path, this._modules.root);
        this.vmData = {
            state: Vue.observable(options.state || {})
        }
    }
    get state() {
        return this.vmData.state
    }
}

class moduleCollection {
    constructor(rootModule) {
        this.register([], rootModule)
    }
    register(path, rootModule) {
        const newModule = {
            _rootModule: rootModule,
            _children: {},
            state: rootModule.state
        }

        if (path.length === 0) {
            this.root = newModule
        } else {

            const parent = path.slice(0, -1).reduce((module, key) => {
                return module._children[key]
            }, this.root)
            parent._children[path[path.length - 1]] = newModule
        }

        if (rootModule.modules) {
            forEachValue(rootModule.modules, (rootChildModule, key) => {
                this.register(path.concat(key), rootChildModule)
            })
        }
    }
}

function installModule(store, rootState, path, rootModule) {

    if (path.length > 0) {
        const parent = path.slice(0, -1).reduce((state, key) => {
            return state[key]
        }, rootState)
        Vue.set(parent, path[path.length - 1], rootModule.state)
    }

    let getters = rootModule._rootModule.getters
    if (getters) {
        forEachValue(getters, (getterFn, getterName) => {
            registerGetter(store, getterName, getterFn, rootModule);
        });
    }

    let mutations = rootModule._rootModule.mutations
    if (mutations) {
        forEachValue(mutations, (mutationFn, mutationName) => {
            registerMutation(store, mutationName, mutationFn, rootModule)
        });
    }

    let actions = rootModule._rootModule.actions
    if (actions) {
        forEachValue(actions, (actionFn, actionName) => {
            registerAction(store, actionName, actionFn, rootModule);
        });
    }

    forEachValue(rootModule._children, (child, key) => {
        installModule(store, rootState, path.concat(key), child)
    })
}

function registerGetter(store, getterName, getterFn, currentModule) {
    Object.defineProperty(store.getters, getterName, {
        get: () => {
            return getterFn.call(store, currentModule.state)
        }
    })
}

function registerMutation(store, mutationName, mutationFn, currentModule) {
    let mutationArr = store.mutations[mutationName] || (store.mutations[mutationName] = []);
    mutationArr.push((payload) => {
        mutationFn.call(store, currentModule.state, payload)
    })
}

function registerAction(store, actionName, actionFn) {
    let actionArr = store.actions[actionName] || (store.actions[actionName] = []);
    actionArr.push((payload) => {
        actionFn.call(store, store, payload)
    })
}

function forEachValue(obj, fn) {
    Object.keys(obj).forEach(key => fn(obj[key], key));
}

export const mapState = stateList => {
    return stateList.reduce((prev, stateName) => {
        prev[stateName] = function() {
            return this.$store.state[stateName]
        }
        return prev
    }, {})
}
export const mapGetters = gettersList => {
    return gettersList.reduce((prev, gettersName) => {
        prev[gettersName] = function() {
            return this.$store.getters[gettersName]
        }
        return prev
    }, {})
}
export const mapMutations = mutationsList => {
    return mutationsList.reduce((prev, mutationsName) => {
        prev[mutationsName] = function(payload) {
            return this.$store.commit(mutationsName, payload)
        }
        return prev
    }, {})
}
export const mapActions = actionsList => {
    return actionsList.reduce((prev, actionsName) => {
        prev[actionsName] = function(payload) {
            return this.$store.dispatch(actionsName, payload)
        }
        return prev
    }, {})
}
export default {
    install,
    Store,
}