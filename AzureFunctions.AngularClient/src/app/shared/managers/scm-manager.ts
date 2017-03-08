import { PortalResources } from './../models/portal-resources';
import { WebApiException } from './../models/webapi-exception';
import { VfsObject } from './../models/vfs-object';
import { ErrorIds } from './../models/error-ids';
import { Observable } from 'rxjs/Rx';
import { FunctionHttpService } from './../services/functions-http.service';
import { AiService } from './../services/ai.service';
import { TranslateService } from 'ng2-translate/ng2-translate';
import { BroadcastService } from './../services/broadcast.service';
import { Headers, Http, Response } from '@angular/http';
import { Cache, ClearAllFunctionCache, ClearCache } from '../decorators/cache.decorator';
import { FunctionInfo } from '../models/function-info';
import { BroadcastEvent } from "../models/broadcast-event";
import { ErrorEvent } from '../models/error-event';
import { FunctionSecrets } from "../models/function-secrets";
import { CreateFunctionInfo } from "../models/create-function-info";

export class ScmManager {

    private masterKey: string;

    constructor(
        private _http: FunctionHttpService,
        private _broadcastService: BroadcastService,
        private _translateService: TranslateService,
        private _aiService: AiService,
        private _scmUrl: string,
        private _scmHeadersCallBack: (contentType?: string) => Headers) { }

    @Cache()
    getFunctions() {
        return this._http.get(`${this._scmUrl}/api/functions`, { headers: this._scmHeadersCallBack() })
            .map<FunctionInfo[]>((r: Response) => {
                try {
                    return r.json();
                } catch (e) {
                    // We have seen this happen when kudu was returning JSON that contained
                    // comments because Json.NET is okay with comments in the JSON file.
                    // We can't parse that JSON in browser, so this is just to handle the error correctly.
                    this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                        message: this._translateService.instant(PortalResources.error_parsingFunctionListReturenedFromKudu),
                        errorId: ErrorIds.deserializingKudusFunctionList
                    });
                    this.trackEvent(ErrorIds.deserializingKudusFunctionList, {
                        error: e,
                        content: r.text(),
                    });
                    return [];
                }
            })
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToRetrieveFunctionListFromKudu),
                    errorId: ErrorIds.unableToRetrieveFunctionsList
                });
                this.trackEvent(ErrorIds.unableToRetrieveFunctionsList, {
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of([]);
            });
    }

    getApiProxies() {
        return this._http.get(`${this._scmUrl}/api/vfs/site/wwwroot/proxies.json`, { headers: this._scmHeadersCallBack() })
            .map<Response>(r => {
                return r.json();
            })
            .catch(_ => Observable.of({ }));
    }

    saveApiProxy(jsonString: string) {
        let headers = this._scmHeadersCallBack();
        // https://github.com/projectkudu/kudu/wiki/REST-API
        headers.append('If-Match', '*');

        return this._http.put(`${this._scmUrl}/api/vfs/site/wwwroot/proxies.json`, jsonString, { headers: headers });
    }

    /**
     * This function returns the content of a file from kudu as a string.
     * @param file either a VfsObject or a string representing the file's href.
     */
    @Cache('href')
    getFileContent(file: VfsObject | string) {
        let fileHref = typeof file === 'string' ? file : file.href;
        return this._http.get(fileHref, { headers: this._scmHeadersCallBack() })
            .map<string>(r => r.text())
            .catch((error: Response) => {
                let fileName = this.getFileName(file);
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToGetFileContentFromKudu, {fileName: fileName}),
                    errorId: ErrorIds.unableToRetrieveFileContent
                });
                this.trackEvent(ErrorIds.unableToRetrieveFileContent, {
                    fileHref: fileHref,
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of('');
            });
    }

    @ClearCache('getFileContent', 'href')
    saveFile(file: VfsObject | string, updatedContent: string, functionInfo?: FunctionInfo) {
        let fileHref = typeof file === 'string' ? file : file.href;
        let headers = this._scmHeadersCallBack('plain/text');
        headers.append('If-Match', '*');

        if (functionInfo) {
            ClearAllFunctionCache(functionInfo);
        }

        return this._http.put(fileHref, updatedContent, { headers: headers })
            .map<VfsObject | string>(r => file)
            .catch((error: Response) => {
                let fileName = this.getFileName(file);
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToSaveFileContentThroughKudu, {fileName: fileName}),
                    errorId: ErrorIds.unableToSaveFileContent
                });
                this.trackEvent(ErrorIds.unableToSaveFileContent, {
                    fileHref: fileHref,
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of(file);
            });
    }

    @ClearCache('getFileContent', 'href')
    deleteFile(file: VfsObject | string, functionInfo?: FunctionInfo) {
        let fileHref = typeof file === 'string' ? file : file.href;
        let headers = this._scmHeadersCallBack('plain/text');
        headers.append('If-Match', '*');

        if (functionInfo) {
            ClearAllFunctionCache(functionInfo);
        }

        return this._http.delete(fileHref, { headers: headers })
            .map<VfsObject | string>(r => file)
            .catch((error: Response) => {
                let fileName = this.getFileName(file);
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToDeleteFileThroughKudu, {fileName: fileName}),
                    errorId: ErrorIds.unableToDeleteFile
                });
                this.trackEvent(ErrorIds.unableToDeleteFile, {
                    fileHref: fileHref,
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of(file);
            });
    }

    @ClearCache('getFunctions')
    createFunction(functionName: string, templateId: string) {
        let observable: Observable<FunctionInfo>;
        if (templateId) {
            let body: CreateFunctionInfo = {
                name: functionName,
                templateId: (templateId && templateId !== 'Empty' ? templateId : null),
                containerScmUrl: this._scmUrl
            };
            observable = this._http.put(`${this._scmUrl}/api/functions/${functionName}`, JSON.stringify(body), { headers: this._scmHeadersCallBack() })
                .map<FunctionInfo>(r => r.json());
        } else {
            observable = this._http
                .put(`${this._scmUrl}/api/functions/${functionName}`, JSON.stringify({ config: {} }), { headers: this._scmHeadersCallBack() })
                .map<FunctionInfo>(r => r.json());
        }

        return observable
                .catch((error: Response) => {
                    this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                        message: this._translateService.instant(PortalResources.error_unableToCreateFunction, { functionName: functionName }),
                        errorId: ErrorIds.unableToCreateFunction
                    });
                    this.trackEvent(ErrorIds.unableToCreateFunction, {
                        content: error.text(),
                        status: error.status.toString(),
                    });
                    return Observable.of({});
                });
    }


    getFunctionContainerAppSettings() {
        let url = `${this._scmUrl}/api/settings`;
        return this._http.get(url, { headers: this._scmHeadersCallBack() })
            .map<{ [key: string]: string }>(r => r.json());
    }

    @ClearCache('getFunctions')
    createFunctionV2(functionName: string, files: any, config: any) {
        let filesCopy = Object.assign({}, files);
        let sampleData = filesCopy['sample.dat'];
        delete filesCopy['sample.dat'];

        let content = JSON.stringify({ files: filesCopy, test_data: sampleData, config: config });
        let url = `${this._scmUrl}/api/functions/${functionName}`;

        return this._http.put(url, content, { headers: this._scmHeadersCallBack() })
            .map<FunctionInfo>(r => r.json())
            .catch((error: Response) => {
                    this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                        message: this._translateService.instant(PortalResources.error_unableToCreateFunction, { functionName: functionName }),
                        errorId: ErrorIds.unableToCreateFunction
                    });
                    this.trackEvent(ErrorIds.unableToCreateFunction, {
                        content: error.text(),
                        status: error.status.toString(),
                    });
                    return Observable.of({});
                });
    }

    @ClearCache('clearAllCachedData')
    deleteFunction(functionInfo: FunctionInfo) {
        return this._http.delete(functionInfo.href, { headers: this._scmHeadersCallBack() })
            .map<string>(r => r.statusText)
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToDeleteFunction, { functionName: functionInfo.name }),
                    errorId: ErrorIds.unableToDeleteFunction
                });
                this.trackEvent(ErrorIds.unableToDeleteFunction, {
                    content: error.text(),
                    status: error.status.toString(),
                    href: functionInfo.href
                });
                return Observable.of('');
            });
    }

    @Cache('secrets_file_href')
    getSecrets(fi: FunctionInfo) {
        return this._http.get(fi.secrets_file_href, { headers: this._scmHeadersCallBack() })
            .map<FunctionSecrets>(r => r.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_UnableToRetrieveSecretsFileFromKudu, { functionName: fi.name }),
                    errorId: ErrorIds.unableToRetrieveSecretsFileFromKudu
                });
                this.trackEvent(ErrorIds.unableToRetrieveSecretsFileFromKudu, {
                    status: error.status.toString(),
                    content: error.text(),
                    href: fi.secrets_file_href
                });
                return Observable.of('');
            });
    }

    @ClearCache('getSecrets', 'secrets_file_href')
    setSecrets(fi: FunctionInfo, secrets: FunctionSecrets) {
        return this.saveFile(fi.secrets_file_href, JSON.stringify(secrets))
            .map<FunctionSecrets>(e => secrets);
    }

    @Cache()
    getHostJson() {
        return this._http.get(`${this._scmUrl}/api/functions/config`, { headers: this._scmHeadersCallBack() })
            .map<any>(r => r.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToRetrieveRuntimeConfig),
                    errorId: ErrorIds.unableToRetrieveRuntimeConfig
                });
                this.trackEvent(ErrorIds.unableToRetrieveRuntimeConfig, {
                    status: error.status.toString(),
                    content: error.text(),
                });
                return Observable.of('');
            });
    }

    @ClearCache('getFunction', 'href')
    saveFunction(fi: FunctionInfo, config: any) {
        ClearAllFunctionCache(fi);
        return this._http.put(fi.href, JSON.stringify({ config: config }), { headers: this._scmHeadersCallBack() })
            .map<FunctionInfo>(r => r.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToUpdateFunction, { functionName: fi.name }),
                    errorId: ErrorIds.unableToUpdateFunction
                });
                this.trackEvent(ErrorIds.unableToUpdateFunction, {
                    status: error.status.toString(),
                    content: error.text(),
                });
                return Observable.of('');
            });
    }

    @Cache('href')
    getFunction(fi: FunctionInfo) {
        return this._http.get(fi.href, { headers: this._scmHeadersCallBack() })
            .map<FunctionInfo>(r => r.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToRetrieveFunction, { functionName: fi.name }),
                    errorId: ErrorIds.unableToRetrieveFunction
                });
                this.trackEvent(ErrorIds.unableToRetrieveFunction, {
                    status: error.status.toString(),
                    content: error.text(),
                });
                return Observable.of('');
            });
    }

    getHostSecretsFromScm() {
        // call kudu
        let masterKey = this._http.get(`${this._scmUrl}/api/functions/admin/masterkey`, { headers: this._scmHeadersCallBack() })
            .catch((error: Response) => {
                try {
                    let exception: WebApiException = error.json();
                    if (exception.ExceptionType === 'System.Security.Cryptography.CryptographicException') {
                        this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                            message: this._translateService.instant(PortalResources.error_unableToDecryptKeys),
                            errorId: ErrorIds.unableToDecryptKeys
                        });
                        this.trackEvent(ErrorIds.unableToDecryptKeys, {
                            content: error.text(),
                            status: error.status.toString()
                        });
                        throw error;
                    }
                } catch (e) {
                    // no-op
                }
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToRetrieveRuntimeKey),
                    errorId: ErrorIds.unableToRetrieveRuntimeKey
                });
                this.trackEvent(ErrorIds.unableToRetrieveRuntimeKey, {
                    status: error.status.toString(),
                    content: error.text(),
                });
                throw error;
            });

            masterKey
                .subscribe((r: Response) => {
                    let key: { masterKey: string } = r.json();
                    this.masterKey = key.masterKey;
                });

        return masterKey;
    }

    updateFunction(fi: FunctionInfo) {
        ClearAllFunctionCache(fi);
        return this._http.put(fi.href, JSON.stringify(fi), { headers: this._scmHeadersCallBack() })
            .map<FunctionInfo>(r => r.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToUpdateFunction, { functionName: fi.name }),
                    errorId: ErrorIds.unableToUpdateFunction
                });
                this.trackEvent(ErrorIds.unableToUpdateFunction, {
                    status: error.status.toString(),
                    content: error.text(),
                });
                return Observable.of('');
            });
    }

    getOldLogs(fi: FunctionInfo, range: number): Observable<string> {
        let url = `${this._scmUrl}/api/vfs/logfiles/application/functions/function/${fi.name}/`;
        return this._http.get(url, { headers: this._scmHeadersCallBack() })
            .catch(e => Observable.of({ json: () => [] }))
            .flatMap<string>(r => {
                let files: any[] = r.json();
                if (files.length > 0) {
                    let headers = this._scmHeadersCallBack();
                    headers.append('Range', `bytes=-${range}`);

                    files
                        .map(e => { e.parsedTime = new Date(e.mtime); return e; })
                        .sort((a, b) => a.parsedTime.getTime() - b.parsedTime.getTime());

                    return this._http.get(files.pop().href, { headers: headers })
                        .map<string>(f => {
                            let content = f.text();
                            let index = content.indexOf('\n');
                            return index !== -1
                                ? content.substring(index + 1)
                                : content;
                        });
                } else {
                    return Observable.of('');
                }
            });
    }

    @Cache('href')
    getVfsObjects(fi: FunctionInfo | string) {
        let href = typeof fi === 'string' ? fi : fi.script_root_path_href;
        return this._http.get(href, { headers: this._scmHeadersCallBack() })
            .map<VfsObject[]>(e => e.json())
            .catch((error: Response) => {
                this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, {
                    message: this._translateService.instant(PortalResources.error_unableToRetrieveDirectoryContent),
                    errorId: ErrorIds.unableToRetrieveDirectoryContent
                });
                this.trackEvent(ErrorIds.unableToRetrieveDirectoryContent, {
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of([]);
            });
    }

    fireSyncTrigger() {
        let url = `${this._scmUrl}/functions/synctriggers`;
        this._http.post(url, '', { headers: this._scmHeadersCallBack() })
            .catch((error: Response) => {
                this.trackEvent(ErrorIds.unableToSyncTriggers, {
                    url: url,
                    content: error.text(),
                    status: error.status.toString()
                });
                return Observable.of(null);
            })
            .subscribe();
    }

    legacyGetHostSecrets() {
        return this._http.get(`${this._scmUrl}/api/vfs/data/functions/secrets/host.json`, { headers: this._scmHeadersCallBack() })
            .retryWhen(e => e.scan<number>((errorCount, err) => {
                if (errorCount >= 100) {
                    throw err;
                }
                return errorCount + 1;
            }, 0).delay(400))
            .map<string>(r => r.json().masterKey)
            .subscribe(h => {
                this.masterKey = h;
                this.isMultiKeySupported = false;
            }, e => console.log(e));
    }


    /**
     * returns the file name from a VfsObject or an href
     * @param file either a VfsObject or a string representing the file's href.
     */
    private getFileName(file: VfsObject | string): string {
        if (typeof file === 'string') {
         // if `file` is a string, that means it's in the format:
         //     https://<scmUrl>/api/vfs/path/to/file.ext
            return  file
                    .split('/') // [ 'https:', '', '<scmUrl>', 'api', 'vfs', 'path', 'to', 'file.ext' ]
                    .pop(); // 'file.ext'
        } else {
            return file.name;
        }
    }


    /**
     * This function is just a wrapper around AiService.trackEvent. It injects default params expected from this class.
     * Currently that's only scmUrl
     * @param params any additional parameters to get added to the default parameters that this class reports to AppInsights
     */
    private trackEvent(name: string, params: {[name: string]: string}) {
        let standardParams = {
            scmUrl: this._scmUrl
        };

        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                standardParams[key] = params[key];
            }
        }

        this._aiService.trackEvent(name, standardParams);
    }
}
