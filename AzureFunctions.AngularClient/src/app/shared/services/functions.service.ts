import { ArmService } from './arm.service';
import { BindingConfig } from '../models/binding';
import { BroadcastEvent } from '../models/broadcast-event';
import { BroadcastService } from './broadcast.service';
import { Cache, ClearAllFunctionCache, ClearCache } from '../decorators/cache.decorator';
import { Constants } from '../models/constants';
import { Cookie } from 'ng2-cookies/ng2-cookies';
import { CreateFunctionInfo } from '../models/create-function-info';
import { DesignerSchema } from '../models/designer-schema';
import { ErrorEvent } from '../models/error-event';
import { FunctionContainer } from '../models/function-container';
import { FunctionInfo } from '../models/function-info';
import { FunctionKey, FunctionKeys } from '../models/function-key';
import { FunctionSecrets } from '../models/function-secrets';
import { FunctionTemplate } from '../models/function-template';
import { GlobalStateService } from './global-state.service';
import { Headers, Http, Response, ResponseType } from '@angular/http';
import { HttpRunModel } from '../models/http-run';
import { Injectable } from '@angular/core';
import { ITryAppServiceTemplate, UIResource } from '../models/ui-resource';
import { Observable } from 'rxjs/Rx';
import { PortalResources } from '../models/portal-resources';
import { RunFunctionResult } from '../models/run-function-result';
import { TranslateService } from 'ng2-translate/ng2-translate';
import { UserService } from './user.service';
import { VfsObject } from '../models/vfs-object';

declare var mixpanel: any;

@Injectable()
export class FunctionsService {
    private token: string;
    private siteName: string;

    public isMultiKeySupported: boolean = true;

    // https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html


    private tryAppServiceUrl = 'https://tryappservice.azure.com';
    private functionContainer: FunctionContainer;

    constructor(
        private _http: Http,
        private _userService: UserService,
        private _globalStateService: GlobalStateService,
        private _translateService: TranslateService,
        private _broadcastService: BroadcastService,
        private _armService: ArmService) {

        if (!Constants.runtimeVersion) {
            this.getLatestRuntime().subscribe((runtime: any) => {
                Constants.runtimeVersion = runtime;
            });
        }

        if (!Constants.routingExtensionVersion) {
            this.getLatestRoutingExtensionVersion().subscribe((routingVersion: any) => {
                Constants.routingExtensionVersion = routingVersion;
            });
        }

        if (!_globalStateService.showTryView) {
            this._userService.getToken().subscribe(t => this.token = t);
            this._userService.getFunctionContainer().subscribe(fc => {
                this.functionContainer = fc;
                this.scmUrl = `https://${fc.properties.hostNameSslStates.find(s => s.hostType === 1).name}/api`;
                this.mainSiteUrl = `https://${fc.properties.defaultHostName}`;
                this.siteName = fc.name;
                this.azureMainServer = this.mainSiteUrl;
                this.azureScmServer = `https://${fc.properties.hostNameSslStates.find(s => s.hostType === 1).name}`;
                this.localServer = 'https://localhost:6061';
            });
        }
        if (Cookie.get('TryAppServiceToken')) {
            this._globalStateService.TryAppServiceToken = Cookie.get('TryAppServiceToken');
            let templateId = Cookie.get('templateId');
            this.selectedFunction = templateId.split('-')[0].trim();
            this.selectedLanguage = templateId.split('-')[1].trim();
            this.selectedProvider = Cookie.get('provider');
            this.selectedFunctionName = Cookie.get('functionName');
        }
    }

    getParameterByName(url, name) {
        if (url === null) {
            url = window.location.href;
        }

        name = name.replace(/[\[\]]/g, '\\$&');
        let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        let results = regex.exec(url);

        if (!results) {
            return null;
        }

        if (!results[2]) {
            return '';
        }

        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    setScmParams(fc: FunctionContainer) {
        this.scmUrl = `https://${fc.properties.hostNameSslStates.find(s => s.hostType === 1).name}/api`;
        this.mainSiteUrl = `https://${fc.properties.defaultHostName}`;
        this.siteName = fc.name;
        if (fc.tryScmCred != null) {
            this._globalStateService.ScmCreds = fc.tryScmCred;
            this.azureScmServer = `https://${fc.properties.hostNameSslStates.find(s => s.hostType === 1).name}`;
        }
    }

    ClearAllFunctionCache(functionInfo: FunctionInfo) {
        ClearAllFunctionCache(functionInfo);
    }

    // This function is special cased in the Cache() decorator by name to allow for dev scenarios.
    @Cache()
    getTemplates() {
        try {
            if (localStorage.getItem('dev-templates')) {
                let devTemplate: FunctionTemplate[] = JSON.parse(localStorage.getItem('dev-templates'));
                this.localize(devTemplate);
                return Observable.of(devTemplate);
            }
        } catch (e) {
            console.error(e);
        }
        let url = `${Constants.serviceHost}api/templates?runtime=${this._globalStateService.ExtensionVersion || 'latest'}`;
        return this._http.get(url, { headers: this.getPortalHeaders() })
            .retryWhen(this.retryAntares)
            .map<FunctionTemplate[]>(r => {
                let object = r.json();
                this.localize(object);
                return object;
            });
    }

    getNewFunctionNode(): FunctionInfo {
        return {
            name: this._translateService.instant(PortalResources.sideBar_newFunction),
            href: null,
            config: null,
            script_href: null,
            template_id: null,
            clientOnly: true,
            isDeleted: false,
            secrets_file_href: null,
            test_data: null,
            script_root_path_href: null,
            config_href: null
        };
    }

    getSettingsNode(): FunctionInfo {
        return {
            name: 'Settings',
            href: null,
            config: null,
            script_href: `${this.scmUrl}/functions/config`,
            template_id: null,
            clientOnly: true,
            isDeleted: false,
            secrets_file_href: null,
            test_data: null,
            script_root_path_href: null,
            config_href: null
        };
    }







    @Cache()
    getDesignerSchema() {
        return this._http.get('mocks/function-json-schema.json')
            .retryWhen(this.retryAntares)
            .map<DesignerSchema>(r => r.json());
    }

    warmupMainSite() {
        if (this.isEasyAuthEnabled) {
            return Observable.of({});
        }
        let observable = this._http.get(this.mainSiteUrl, { headers: this.getScmSiteHeaders() })
            .retryWhen(this.retryAntares)
            .catch(e => this.checkCorsOrDnsErrors(e))
            .map<string>(r => r.statusText);

        observable.subscribe();
        return observable;
    }


    getScmUrl() {
        return this.azureScmServer;
    }

    getSiteName() {
        return this.siteName;
    }

    getMainSiteUrl(): string {
        return this.mainSiteUrl;
    }



    @Cache()
    getBindingConfig(): Observable<BindingConfig> {
        try {
            if (localStorage.getItem('dev-bindings')) {
                let devBindings: BindingConfig = JSON.parse(localStorage.getItem('dev-bindings'));
                this.localize(devBindings);
                return Observable.of(devBindings);
            }
        } catch (e) {
            console.error(e);
        }

        let url = Constants.serviceHost + 'api/bindingconfig?runtime=' + this._globalStateService.ExtensionVersion;

        return this._http.get(url, { headers: this.getPortalHeaders() })
            .retryWhen(this.retryAntares)
            .catch(e => this.checkCorsOrDnsErrors(e))
            .map<BindingConfig>(r => {
                let object = r.json();
                this.localize(object);
                return object;
            });
    }

    getResources(): Observable<any> {
        let runtime = this._globalStateService.ExtensionVersion ? this._globalStateService.ExtensionVersion : 'default';

        if (this._userService.inIFrame) {
            return this._userService.getLanguage()
                .flatMap((language: string) => {
                    return this.getLocolizedResources(language, runtime);
                });

        } else {
            return this.getLocolizedResources('en', runtime);
        }
    }

    get HostSecrets() {
        return this.masterKey;
    }

    getTrialResource(provider?: string): Observable<UIResource> {
        let url = this.tryAppServiceUrl + '/api/resource?appServiceName=Function'
            + (provider ? '&provider=' + provider : '');

        return this._http.get(url, { headers: this.getTryAppServiceHeaders() })
            .retryWhen(this.retryGetTrialResource)
            .map<UIResource>(r => r.json());
    }

    createTrialResource(selectedTemplate: FunctionTemplate, provider: string, functionName: string): Observable<UIResource> {
        let url = this.tryAppServiceUrl + '/api/resource?appServiceName=Function'
            + (provider ? '&provider=' + provider : '')
            + '&templateId=' + encodeURIComponent(selectedTemplate.id)
            + '&functionName=' + encodeURIComponent(functionName);

        let template = <ITryAppServiceTemplate>{
            name: selectedTemplate.id,
            appService: 'Function',
            language: selectedTemplate.metadata.language,
            githubRepo: ''
        };

        return this._http.post(url, JSON.stringify(template), { headers: this.getTryAppServiceHeaders() })
            .retryWhen(this.retryCreateTrialResource)
            .map<UIResource>(r => r.json());
    }





    getFunctionAppArmId() {
        if (this.functionContainer && this.functionContainer.id && this.functionContainer.id.trim().length !== 0) {
            return this.functionContainer.id;
        } else if (this.scmUrl) {
            return this.scmUrl;
        } else {
            return 'Unknown';
        }
    }

    setEasyAuth(config: { [key: string]: any }) {
        this.isEasyAuthEnabled = config['enabled'] && config['unauthenticatedClientAction'] !== 1;
    }



    getLatestRuntime() {
        return this._http.get(Constants.serviceHost + 'api/latestruntime', { headers: this.getPortalHeaders() })
            .map(r => {
                return r.json();
            })
            .retryWhen(this.retryAntares)
            .catch(e => this.checkCorsOrDnsErrors(e));
    }

    getLatestRoutingExtensionVersion() {
        return this._http.get(Constants.serviceHost + 'api/latestrouting', { headers: this.getPortalHeaders() })
            .map(r => {
                return r.json();
            })
            .retryWhen(this.retryAntares)
            .catch(e => this.checkCorsOrDnsErrors(e));
    }





    @Cache()
    getJson(uri: string) {
        return this._http.get(uri, { headers: this.getMainSiteHeaders() })
            .map<FunctionKeys>(r => r.json());
    }

    diagnose() {
        if (this.functionContainer && this.functionContainer.id && this.functionContainer.id.trim().length !== 0) {
            this._http.post(Constants.serviceHost + `api/diagnose${this.functionContainer.id}`, this.getPortalHeaders())
                .subscribe(s => console.log(s.json()), e => console.log(e));
        }
    }

    // to talk to scm site
    private getScmSiteHeaders(contentType?: string): Headers {
        contentType = contentType || 'application/json';
        let headers = new Headers();
        headers.append('Content-Type', contentType);
        headers.append('Accept', 'application/json,*/*');
        if (!this._globalStateService.showTryView && this.token) {
            headers.append('Authorization', `Bearer ${this.token}`);
        }
        if (this._globalStateService.ScmCreds) {
            headers.append('Authorization', `Basic ${this._globalStateService.ScmCreds}`);
        }
        return headers;
    }

    private getMainSiteHeaders(contentType?: string): Headers {
        contentType = contentType || 'application/json';
        let headers = new Headers();
        headers.append('Content-Type', contentType);
        headers.append('Accept', 'application/json,*/*');
        headers.append('x-functions-key', this.masterKey);
        return headers;
    }

    // to talk to Functions Portal
    private getPortalHeaders(contentType?: string): Headers {
        contentType = contentType || 'application/json';
        let headers = new Headers();
        headers.append('Content-Type', contentType);
        headers.append('Accept', 'application/json,*/*');

        if (this.token) {
            headers.append('client-token', this.token);
            headers.append('portal-token', this.token);
        }

        return headers;
    }

    // to talk to TryAppservice
    private getTryAppServiceHeaders(contentType?: string): Headers {
        contentType = contentType || 'application/json';
        let headers = new Headers();
        headers.append('Content-Type', contentType);
        headers.append('Accept', 'application/json,*/*');

        if (this._globalStateService.TryAppServiceToken) {
            headers.append('Authorization', `Bearer ${this._globalStateService.TryAppServiceToken}`);
        } else {
            headers.append('ms-x-user-agent', 'Functions/');
        }
        return headers;
    }

    private localize(objectTolocalize: any) {
        if ((typeof value === 'string') && (value.startsWith('$'))) {
            objectTolocalize[property] = this._translateService.instant(value.substring(1, value.length));
        }

        for (var property in objectTolocalize) {

            if (property === 'files' || property === 'defaultValue') {
                continue;
            }

            if (objectTolocalize.hasOwnProperty(property)) {
                var value = objectTolocalize[property];
                if ((typeof value === 'string') && (value.startsWith('$'))) {
                    var key = value.substring(1, value.length);
                    var locString = this._translateService.instant(key);
                    if (locString !== key) {
                        objectTolocalize[property] = locString;
                    }
                }
                if (typeof value === 'array') {
                    for (var i = 0; i < value.length; i++) {
                        this.localize(value[i]);
                    }
                }
                if (typeof value === 'object') {
                    this.localize(value);
                }
            }
        }
    }

    private getLocolizedResources(lang: string, runtime: string): Observable<any> {
        return this._http.get(Constants.serviceHost + `api/resources?name=${lang}&runtime=${runtime}`, { headers: this.getPortalHeaders() })
            .retryWhen(this.retryAntares)
            .map<any>(r => {
                let resources = r.json();

                this._translateService.setDefaultLang('en');
                this._translateService.setTranslation('en', resources.en);
                if (resources.lang) {
                    this._translateService.setTranslation(lang, resources.lang);
                }
                this._translateService.use(lang);
            });
    }

    private retryAntares(error: Observable<any>): Observable<any> {
        return error.scan<number>((errorCount, err: Response) => {
            if (errorCount >= 10) {
                throw err;
            } else {
                return errorCount + 1;
            }
        }, 0).delay(1000);
    }

    private retryCreateTrialResource(error: Observable<any>): Observable<any> {
        return error.scan<number>((errorCount, err: Response) => {
            // 400 => you already have a resource, 403 => No login creds provided
            if (err.status === 400 || err.status === 403 || errorCount >= 10) {
                throw err;
            } else {
                return errorCount + 1;
            }
        }, 0).delay(1000);
    }

    private retryGetTrialResource(error: Observable<any>): Observable<any> {
        return error.scan<number>((errorCount, err: Response) => {
            // 403 => No login creds provided
            if (err.status === 403 || errorCount >= 10) {
                throw err;
            } else {
                return errorCount + 1;
            }
        }, 0).delay(1000);
    }

    private checkCorsOrDnsErrors(error: Response): Observable<Response> {
        if (error.status < 404 && error.type === ResponseType.Error) {
            this._armService.getConfig(this.functionContainer)
                .subscribe(config => {
                    let cors: { allowedOrigins: string[] } = <any>config['cors'];
                    let isConfigured = (cors && cors.allowedOrigins && cors.allowedOrigins.length > 0)
                        ? !!cors.allowedOrigins.find(o => o.toLocaleLowerCase() === window.location.origin)
                        : false;
                    if (!isConfigured) {
                        // CORS Error
                        let message = this._translateService.instant(PortalResources.error_CORSNotConfigured, {
                            origin: window.location.origin
                        });
                        this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                            message: message,
                            details: JSON.stringify(error)
                        });
                    } else {
                        // DNS resolution or any error that results from the worker process crashing or restarting
                        this._broadcastService.broadcast<ErrorEvent>(
                            BroadcastEvent.Error,
                            { message: this._translateService.instant(PortalResources.error_DnsResolution) }
                        );
                    }
                }, (e: Response) => {
                    let message = this._translateService.instant(PortalResources.error_UnableToRetriveFunctionApp, {
                        functionApp: this.functionContainer.name
                    });

                    this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                        message: message,
                        details: JSON.stringify(e)
                    });
                });
        } else {
            let message = this._translateService.instant(PortalResources.error_UnableToRetriveFunctions, {
                statusText: this.statusCodeToText(error.status)
            });

            this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                message: message,
                details: JSON.stringify(error)
            });
        }
        throw error;
    }


}
