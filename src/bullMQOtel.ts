import { TraceAPI, trace as OtelTrace, PropagationAPI, ContextAPI, context, propagation, Context as OtelContext, Span as OtelSpan } from '@opentelemetry/api';
import { Carrier, ContextManager, Telemetry, Trace, Tracer } from 'bullmq';

class OTelContextManager implements ContextManager<OtelContext> {
    private contextAPI: ContextAPI = context;

    getMetadata(ctx: OtelContext) {
        const metadata: Carrier = {};
        propagation.inject(ctx, metadata);
        return metadata;
    }

    fromMetadata(activeCtx: OtelContext, metadata: Record<string, string>) {
        const ctx = propagation.extract(activeCtx, metadata);
        return ctx;
    }

    with<A extends (...args: any[]) => any>(ctx: OtelContext, fn: A): ReturnType<A> {
        return this.contextAPI.with(ctx, fn);
    }

    active(): OtelContext {
        return this.contextAPI.active();
    }
}

class OTelTrace implements Trace<OtelSpan> {
    getTracer(name: string, version?: string): Tracer {
        return OtelTrace.getTracer(name, version);
    }

    setSpan(ctx: OtelContext, span: OtelSpan): OtelContext {
        return OtelTrace.setSpan(ctx, span);
    }
}

export class BullMQOtel implements Telemetry<OtelContext> {
    trace: OTelTrace;
    contextManager: OTelContextManager;
    tracerName: string;
    propagation: PropagationAPI;

    constructor(tracerName: string) {
        this.trace = new OTelTrace();
        this.contextManager = new OTelContextManager();
        this.tracerName = tracerName;
        this.propagation = propagation;
    }
};