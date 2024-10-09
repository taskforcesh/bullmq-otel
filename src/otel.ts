import { TraceAPI, trace as OtelTrace, PropagationAPI, ContextAPI, context, propagation, Context as OtelContext, Span as OtelSpan } from '@opentelemetry/api';
import { Carrier, ContextManager, Telemetry, Trace, Tracer } from 'bullmq';

class ExtendedContextManager implements ContextManager<OtelContext> {
    private contextAPI: ContextAPI;

    constructor() {
        this.contextAPI = context;
    }

    getMetadata(context: OtelContext) {
        const metadata: Carrier = {};
        propagation.inject(context, metadata);
        return metadata;
    }

    fromMetadata(activeContext: OtelContext, metadata: Record<string, string>) {
        const context = propagation.extract(activeContext, metadata);
        return context;
    }

    with<A extends (...args: any[]) => any>(context: OtelContext, fn: A): ReturnType<A> {
        return this.contextAPI.with(context, fn);
    }

    active(): OtelContext {
        return this.contextAPI.active();
    }
}

class ExtendedTrace implements Trace<OtelSpan> {
    private traceAPI: TraceAPI;

    constructor() {
        this.traceAPI = OtelTrace;
    }

    getTracer(name: string, version?: string): Tracer {
        return this.traceAPI.getTracer(name, version);
    }

    setSpan(context: OtelContext, span: OtelSpan): OtelContext {
        return this.traceAPI.setSpan(context, span);
    }
}

export class Otel implements Telemetry<OtelContext> {
    trace: ExtendedTrace;
    contextManager: ExtendedContextManager;
    tracerName: string;
    propagation: PropagationAPI;

    constructor(tracerName: string) {
        this.trace = new ExtendedTrace();
        this.contextManager = new ExtendedContextManager();
        this.tracerName = tracerName;
        this.propagation = propagation;
    }
};