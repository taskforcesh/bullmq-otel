import {
  trace,
  Tracer as OtelTracer,
  ContextAPI,
  context,
  propagation,
  Context as OtelContext,
  Span as OtelSpan,
  metrics as otelMetrics,
  Meter as OtelMeter,
} from '@opentelemetry/api';

import {
  ContextManager,
  Telemetry,
  Tracer,
  Span,
  AttributeValue,
  Attributes,
  Time,
  Exception,
  Configuration
} from 'bullmq';

class BullMQOTelContextManager implements ContextManager<OtelContext> {
  private contextAPI: ContextAPI = context;

  getMetadata(ctx: OtelContext): string {
    const metadata = {};
    propagation.inject(ctx, metadata);
    return JSON.stringify(metadata);
  }

  fromMetadata(activeCtx: OtelContext, metadata: string) {
    const metadataObj = JSON.parse(metadata);
    const ctx = propagation.extract(activeCtx, metadataObj);
    return ctx;
  }

  with<A extends (...args: any[]) => any>(
    ctx: OtelContext,
    fn: A,
  ): ReturnType<A> {
    return this.contextAPI.with(ctx, fn);
  }

  active(): OtelContext {
    return this.contextAPI.active();
  }
}

class BullMQOtelTracer implements Tracer {
  constructor(private tracer: OtelTracer) {}

  startSpan(
    name: string,
    options?: any,
    context?: OtelContext,
  ): Span<OtelContext> {
    const span = this.tracer.startSpan(name, options, context);
    return new BullMQOTelSpan(span);
  }
}

export class BullMQOTelSpan implements Span<OtelContext> {
  constructor(public span: OtelSpan) {}

  setSpanOnContext(ctx: OtelContext): OtelContext {
    return trace.setSpan(ctx, this.span);
  }

  setAttribute(key: string, value: AttributeValue): void {
    this.span.setAttribute(key, value);
  }

  setAttributes(attributes: Attributes): void {
    this.span.setAttributes(attributes);
  }

  addEvent(name: string, attributes?: Attributes, time?: Time): void {
    this.span.addEvent(name, attributes, time);
  }

  recordException(exception: Exception, time?: Time): void {
    this.span.recordException(exception, time);
  }

  end(): void {
    this.span.end();
  }
}

export class BullMQOtel implements Telemetry<OtelContext> {
  tracer: BullMQOtelTracer;
  contextManager: BullMQOTelContextManager;

  meter: OtelMeter;

  constructor(telemetry: Configuration) {
    const {traces, metrics} = telemetry;

    if (traces) {
      this.tracer = new BullMQOtelTracer(trace.getTracer(traces.name, traces.version));
      this.contextManager = new BullMQOTelContextManager();
    }

    if (metrics) {
      this.meter = otelMetrics.getMeter(metrics.name, metrics.version);
    }
  }
}
