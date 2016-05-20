import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {UserService} from './user.service';
import {Observable, Subscription as RxSubscription} from 'rxjs/Rx';
import {FunctionsService} from './functions.service';
import {BroadcastService} from '../services/broadcast.service';
import {BroadcastEvent} from '../models/broadcast-event'
import {ErrorEvent} from '../models/error-event';
import {Constants} from '../models/constants';

@Injectable()
export class BackgroundTasksService {

    private _preIFrameTasks: RxSubscription;
    private _tasks: RxSubscription;
    constructor(private _http: Http,
        private _userService: UserService,
        private _functionsService: FunctionsService,
        private _broadcastService: BroadcastService) {
            if (!this._userService.inIFrame) {
                this.runPreIFrameTasks();
            }
    }

    runPreIFrameTasks() {
        if (this._preIFrameTasks && this._preIFrameTasks.isUnsubscribed) {
            this._preIFrameTasks.unsubscribe();
        }
        this._preIFrameTasks = Observable.timer(1, 60000)
            .concatMap<string>(() => this._http.get('api/token?plaintext=true').retry(5).map<string>(r => r.text()))
            .subscribe(t => this._userService.setToken(t));
    }

    runTasks() {
        if (this._tasks && this._tasks.isUnsubscribed) {
            this._tasks.unsubscribe();
        }
        this._tasks = Observable.timer(1, 60000)
        .concatMap<{errors: string[], config: {[key: string]: string}, appSettings: {[key: string]: string} }>(() =>
            Observable.zip(
                this._functionsService.getHostErrors().catch(e => Observable.of([])),
                this._functionsService.getConfig(),
                this._functionsService.getAppSettings(),
                (e,  c, a) => ({errors: e, config: c, appSettings: a})
            )
        )
        .subscribe(result => {
            result.errors.forEach(e => this._broadcastService.broadcast<ErrorEvent>(BroadcastEvent.Error, { message: e, details: `Host Error: ${e}` }));
            this.setDisabled(result.config);
            this._functionsService.setEasyAuth(result.config);
            this._functionsService.extensionVersion = result.appSettings[Constants.extensionVersionAppSettingName];
            this._broadcastService.broadcast(BroadcastEvent.VesrionUpdated);
        });
    }

    private setDisabled(config: any) {
        if (!config["scmType"] || config["scmType"] !== "None") {
            this._broadcastService.setDirtyState("function_disabled");
        } else {
            this._broadcastService.clearDirtyState("function_disabled", true);
        }
    }
}