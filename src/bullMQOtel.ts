import {
  trace,
  Tracer as OtelTracer,
  ContextAPI,
  context,
  propagation,
  Context as OtelContext,
  Span as OtelSpan,
  metrics,
  Meter as OtelMeter,
  Counter as OtelCounter,
  Histogram as OtelHistogram,
  MetricOptions as OtelMetricOptions,
} from '@opentelemetry/api';
import {
  AttributeValue,
  Attributes,
  Meter,
  Counter,
  Histogram
} from './interfaces';
import {
  ContextManager,
  Telemetry,
  Tracer,
  Span,
  Time,
  Exception,
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

class BullMQOTelCounter implements Counter {
  constructor(private counter: OtelCounter) {}

  add(value: number, attributes?: Attributes): void {
    this.counter.add(value, attributes);
  }
}

class BullMQOTelHistogram implements Histogram {
  constructor(private histogram: OtelHistogram) {}

  record(value: number, attributes?: Attributes): void {
    this.histogram.record(value, attributes);
  }
}

class BullMQOTelMeter implements Meter {
  private counters: Map<string, BullMQOTelCounter> = new Map();
  private histograms: Map<string, BullMQOTelHistogram> = new Map();

  constructor(private meter: OtelMeter) {}

  createCounter(name: string, options?: OtelMetricOptions): Counter {
    // Cache counters to avoid creating duplicates
    let counter = this.counters.get(name);
    if (!counter) {
      const otelCounter = this.meter.createCounter(name, options);
      counter = new BullMQOTelCounter(otelCounter);
      this.counters.set(name, counter);
    }
    return counter;
  }

  createHistogram(name: string, options?: OtelMetricOptions): Histogram {
    // Cache histograms to avoid creating duplicates
    let histogram = this.histograms.get(name);
    if (!histogram) {
      const otelHistogram = this.meter.createHistogram(name, options);
      histogram = new BullMQOTelHistogram(otelHistogram);
      this.histograms.set(name, histogram);
    }
    return histogram;
  }
}

/**
 * Configuration options for BullMQOtel telemetry
 */
export interface BullMQOtelOptions {
  /**
   * Name for the tracer (default: 'bullmq')
   */
  tracerName?: string;

  /**
   * Name for the meter (default: 'bullmq')
   */
  meterName?: string;

  /**
   * Version string for both tracer and meter
   */
  version?: string;

  /**
   * Enable metrics collection. When true, a meter will be created
   * to record job metrics like completed/failed counts and durations.
   * @default false
   */
  enableMetrics?: boolean;
}

export class BullMQOtel implements Telemetry<OtelContext> {
  tracer: BullMQOtelTracer;
  contextManager: BullMQOTelContextManager;
  meter?: BullMQOTelMeter;

  /**
   * Creates a new BullMQOtel telemetry instance.
   *
   * @param tracerNameOrOptions - Either a tracer name string (for backward compatibility)
   *                              or a configuration options object
   * @param version - Version string (only used when first parameter is a string)
   *
   * @example
   * // Simple usage (backward compatible)
   * const telemetry = new BullMQOtel('my-app', '1.0.0');
   *
   * @example
   * // With metrics enabled
   * const telemetry = new BullMQOtel({
   *   tracerName: 'my-app',
   *   meterName: 'my-app',
   *   version: '1.0.0',
   *   enableMetrics: true,
   * });
   */
  constructor(tracerNameOrOptions?: string | BullMQOtelOptions, version?: string) { // TODO: keep only BullMQOtelOptions in the future as object
    let options: BullMQOtelOptions;

    if (typeof tracerNameOrOptions === 'string') {
      // Backward compatible: (tracerName, version?)
      options = {
        tracerName: tracerNameOrOptions,
        version,
        enableMetrics: false,
      };
    } else if (tracerNameOrOptions === undefined) {
      // No arguments provided
      options = {
        tracerName: 'bullmq',
        version,
        enableMetrics: false,
      };
    } else {
      // New options object style
      options = {
        tracerName: 'bullmq',
        meterName: 'bullmq',
        enableMetrics: false,
        version,
        ...tracerNameOrOptions,
      };
    }

    this.tracer = new BullMQOtelTracer(
      trace.getTracer(options.tracerName!, options.version),
    );
    this.contextManager = new BullMQOTelContextManager();

    if (options.enableMetrics) {
      const otelMeter = metrics.getMeter(
        options.meterName ?? options.tracerName!,
        options.version,
      );
      this.meter = new BullMQOTelMeter(otelMeter);
    }
  }
}
