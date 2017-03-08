import { PortalResources } from './../models/portal-resources';
import { WebApiException } from './../models/webapi-exception';
import { VfsObject } from './../models/vfs-object';
import { ErrorIds } from './../models/error-ids';
import { Observable } from 'rxjs/Rx';
import { FunctionHttpService } from './../services/functions-http.service';
import { AiService } from './../services/ai.service';
import { TranslateService } from 'ng2-translate/ng2-translate';
import { BroadcastService } from './../services/broadcast.service';
import { Headers, Http, Response, ResponseType } from '@angular/http';
import { Cache, ClearAllFunctionCache, ClearCache } from '../decorators/cache.decorator';
import { FunctionInfo } from '../models/function-info';
import { BroadcastEvent } from "../models/broadcast-event";
import { ErrorEvent } from '../models/error-event';
import { FunctionSecrets } from "../models/function-secrets";
import { CreateFunctionInfo } from "../models/create-function-info";
import { Constants } from "../models/constants";
import { HttpRunModel } from "../models/http-run";
import { FunctionKeys, FunctionKey } from "../models/function-key";
import { RunFunctionResult } from "../models/run-function-result";


export class FunctionRuntimeManager {

    private statusCodeMap = {
        0: 'Unknown HTTP Error',
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        306: '(Unused)',
        307: 'Temporary Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Requested Range Not Satisfiable',
        417: 'Expectation Failed',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
        505: 'HTTP Version Not Supported'
    };

    private genericStatusCodeMap = {
        100: 'Informational',
        200: 'Success',
        300: 'Redirection',
        400: 'Client Error',
        500: 'Server Error'
    };

    statusCodeToText(code: number) {
        let statusClass = Math.floor(code / 100) * 100;
        return this.statusCodeMap[code] || this.genericStatusCodeMap[statusClass] || 'Unknown Status Code';
    }

    private isEasyAuthEnabled: boolean;

    constructor(
        private _http: FunctionHttpService,
        private _broadcastService: BroadcastService,
        private _translateService: TranslateService,
        private _aiService: AiService,
        private _runtTimeUrl: string,
        private _runtimeHeadersCallBack: (contentType?: string, renewKey?: boolean) => Headers) { }

        runHttpFunction(functionInfo: FunctionInfo, url: string, model: HttpRunModel) {
        let content = model.body;

        let regExp = /\{([^}]+)\}/g;
        let matchesPathParams = url.match(regExp);
        let processedParams = [];

        let splitResults = url.split('?');
        if (splitResults.length === 2) {
            url = splitResults[0];
        }

        if (matchesPathParams) {
            matchesPathParams.forEach((m) => {
                let name = m.split(':')[0].replace('{', '').replace('}', '');
                processedParams.push(name);
                let param = model.queryStringParams.find((p) => {
                    return p.name === name;
                });
                if (param) {
                    url = url.replace(m, param.value);
                }
            });
        }

        let firstDone = false;
        model.queryStringParams.forEach((p, index) => {
            let findResult = processedParams.find((pr) => {
                return pr === p.name;
            });

            if (!findResult) {
                if (!firstDone) {
                    url += '?';
                    firstDone = true;
                } else {
                    url += '&';
                }
                url += p.name + '=' + p.value;
            }
        });
        let inputBinding = (functionInfo.config && functionInfo.config.bindings
            ? functionInfo.config.bindings.find(e => e.type === 'httpTrigger')
            : null);

        let contentType: string;
        if (!inputBinding || inputBinding && inputBinding.webHookType) {
            contentType = 'application/json';
        }

        let headers = this._runtimeHeadersCallBack(contentType);
        model.headers.forEach((h) => {
            headers.append(h.name, h.value);
        });

        let response: Observable<Response>;
        switch (model.method) {
            case Constants.httpMethods.GET:
                response = this._http.get(url, { headers: headers });
                break;
            case Constants.httpMethods.POST:
                response = this._http.post(url, content, { headers: headers });
                break;
            case Constants.httpMethods.DELETE:
                response = this._http.delete(url, { headers: headers });
                break;
            case Constants.httpMethods.HEAD:
                response = this._http.head(url, { headers: headers });
                break;
            case Constants.httpMethods.PATCH:
                response = this._http.patch(url, content, { headers: headers });
                break;
            case Constants.httpMethods.PUT:
                response = this._http.put(url, content, { headers: headers });
                break;
            default:
                response = this._http.request(url, {
                    headers: headers,
                    method: model.method,
                    body: content
                });
                break;
        }

        return this.runFunctionInternal(response, functionInfo);
    }

    runFunction(functionInfo: FunctionInfo, content: string) {
        let url = `${this._runtTimeUrl}/admin/functions/${functionInfo.name.toLocaleLowerCase()}`;
        let _content: string = JSON.stringify({ input: content });
        let contentType: string;

        try {
            JSON.parse(_content);
            contentType = 'application/json';
        } catch (e) {
            contentType = 'plain/text';
        }


        return this.runFunctionInternal(
            this._http.post(url, _content, { headers: this._runtimeHeadersCallBack(contentType) }),
            functionInfo);

    }

    getFunctionHostKeys(): Observable<FunctionKeys> {
        if (this.isEasyAuthEnabled) {
            return Observable.of({keys: [], links: []});
        }

        let hostKeys = this._http.get(`${this._runtTimeUrl}/admin/host/keys`, { headers: this._runtimeHeadersCallBack() })
            .retryWhen(e => e.scan<number>((errorCount, err: Response) => {
                if (err.status === 404) {
                    throw err;
                } else if (err.status === 401) {

                }
                if (errorCount >= 10) {
                    throw err;
                }
                return errorCount + 1;
            }, 0).delay(400))
            .catch((e: Response) => {
                if (e.status === 404) {
                    throw e;
                }
                return this.checkCorsOrDnsErrors(e);
            })
            .map<FunctionKeys>(r => {
                let keys: FunctionKeys = r.json();
                if (keys && Array.isArray(keys.keys)) {
                    keys.keys.unshift({
                        name: '_master',
                        value: this.masterKey
                    });
                }
                return keys;
            });

        hostKeys.subscribe(r => {
            this.isMultiKeySupported = true;
        }, e => {
            this.isMultiKeySupported = false;
        });
        return hostKeys;
    }

    getFunctionErrors(fi: FunctionInfo) {
        return this.isEasyAuthEnabled
            ? Observable.of([])
            : this._http.get(`${this._runtTimeUrl}/admin/functions/${fi.name}/status`, { headers: this._runtimeHeadersCallBack() })
                .map<string[]>(r => r.json().errors || [])
                .catch<string[]>(e => Observable.of(null));
    }

    getHostErrors() {
        if (this.isEasyAuthEnabled || !this.masterKey) {
            return Observable.of([]);
        } else {
            return this._http.get(`${this._runtTimeUrl}/admin/host/status`, { headers: this._runtimeHeadersCallBack() })
                .retryWhen(e => e.scan<number>((errorCount, err) => {
                    // retry 12 times with 5 seconds delay. This would retry for 1 minute before throwing.
                    if (errorCount >= 12) {
                        throw err;
                    }
                    return errorCount + 1;
                }, 0).delay(5000))
                .map<string[]>(r => r.json().errors || []);
        }
    }

    @Cache()
    getFunctionHostId() {
        if (this.isEasyAuthEnabled || !this.masterKey) {
            return Observable.of([]);
        } else {
            return this._http.get(`${this._runtTimeUrl}/admin/host/status`, { headers: this._runtimeHeadersCallBack() })
                .map<string>(r => r.json().id)
                .catch(e => Observable.of(null));
        }
    }

    @Cache('href')
    getFunctionKeys(functionInfo: FunctionInfo) {
        return this._http.get(`${this._runtTimeUrl}/admin/functions/${functionInfo.name}/keys`, { headers: this._runtimeHeadersCallBack() })
            .map<FunctionKeys>(r => r.json());
    }

    @ClearCache('clearAllFunction', 'getFunctionKeys')
    @ClearCache('clearAllFunction', 'getFunctionHostKeys')
    createKey(keyName: string, keyValue: string, functionInfo?: FunctionInfo) {
        let url = functionInfo
            ? `${this._runtTimeUrl}/admin/functions/${functionInfo.name}/keys/${keyName}`
            : `${this._runtTimeUrl}/admin/host/keys/${keyName}`;

        if (keyValue) {
            let body = {
                name: keyName,
                value: keyValue
            };
            return this._http.put(url, JSON.stringify(body), { headers: this._runtimeHeadersCallBack() })
                .map<FunctionKey>(r => r.json());
        } else {
            return this._http.post(url, '', { headers: this._runtimeHeadersCallBack() })
                .map<FunctionKey>(r => r.json());
        }
    }

    @ClearCache('clearAllFunction', 'getFunctionKeys')
    @ClearCache('clearAllFunction', 'getFunctionHostKeys')
    deleteKey(key: FunctionKey, functionInfo?: FunctionInfo) {
        let url = functionInfo
            ? `${this._runtTimeUrl}/admin/functions/${functionInfo.name}/keys/${key.name}`
            : `${this._runtTimeUrl}/admin/host/keys/${key.name}`;

        return this._http.delete(url, { headers: this._runtimeHeadersCallBack() })
    }

    @ClearCache('clearAllFunction', 'getFunctionKeys')
    @ClearCache('clearAllFunction', 'getFunctionHostKeys')
    renewKey(key: FunctionKey, functionInfo?: FunctionInfo) {
        let url = functionInfo
            ? `${this._runtTimeUrl}/admin/functions/${functionInfo.name}/keys/${key.name}`
            : `${this._runtTimeUrl}/admin/host/keys/${key.name}`;
        let keyRenew = this._http.post(url, '', { headers: this._runtimeHeadersCallBack() })
            .share();
        if (!functionInfo && key.name === '_master') {
            keyRenew.subscribe(r => {
                this.masterKey = r.json().value;
            });
            return keyRenew.delay(100);
        } else {
            return keyRenew;
        }
    }

    private runFunctionInternal(response: Observable<Response>, functionInfo: FunctionInfo) {
        return response
            .catch((e: Response) => {
                if (this.isEasyAuthEnabled) {
                    return Observable.of({
                        status: 401,
                        statusText: this.statusCodeToText(401),
                        text: () => this._translateService.instant(PortalResources.functionService_authIsEnabled)
                    });
                } else if (e.status === 200 && e.type === ResponseType.Error) {
                    return Observable.of({
                        status: 502,
                        statusText: this.statusCodeToText(502),
                        text: () => this._translateService.instant(PortalResources.functionService_errorRunningFunc, {
                            name: functionInfo.name
                        })
                    });
                } else if (e.status === 0 && e.type === ResponseType.Error) {
                    return Observable.of({
                        status: 0,
                        statusText: this.statusCodeToText(0),
                        text: () => ''
                    });
                } else {
                    return Observable.of({
                        status: e.status,
                        statusText: this.statusCodeToText(e.status),
                        text: () => ''
                    });
                }
            })
            .map<RunFunctionResult>(r => ({ statusCode: r.status, statusText: this.statusCodeToText(r.status), content: r.text() }));
    }
}