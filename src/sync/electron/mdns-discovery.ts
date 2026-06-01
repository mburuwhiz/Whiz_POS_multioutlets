const bonjour = require('bonjour')();

export class MdnsDiscovery {
  private serviceName = 'whizpos';
  private serviceType = 'tcp';
  private localService: any;
  private discoveredDevices: Map<string, { name: string; ip: string; port: number; type: 'server' | 'outlet' }> = new Map();

  constructor(private deviceType: 'server' | 'outlet', private deviceName: string, private port: number) {}

  startAdvertise() {
    this.localService = bonjour.publish({
      name: this.deviceName,
      type: this.serviceName,
      subtype: this.deviceType,
      port: this.port,
      txt: {
        type: this.deviceType,
        version: '2.0'
      }
    });
    console.log(`[MDNS] Advertising as ${this.deviceType} on port ${this.port}`);
  }

  startDiscovery() {
    const browser = bonjour.find({ type: this.serviceName });
    browser.on('up', (service: any) => {
      const deviceInfo = {
        name: service.name,
        ip: service.addresses?.[0] || '127.0.0.1',
        port: service.port,
        type: service.txt?.type || 'unknown'
      };
      if (deviceInfo.type !== this.deviceType) { // Don't find same type
        this.discoveredDevices.set(service.name, deviceInfo);
        console.log(`[MDNS] Found device: ${service.name} at ${deviceInfo.ip}:${deviceInfo.port}`);
        // Emit event
        if (globalThis?.mdnsEmitter) {
          globalThis.mdnsEmitter.emit('deviceFound', deviceInfo);
        }
      }
    });
    browser.on('down', (service: any) => {
      this.discoveredDevices.delete(service.name);
      if (globalThis?.mdnsEmitter) {
        globalThis.mdnsEmitter.emit('deviceLost', service.name);
      }
    });
    console.log('[MDNS] Started discovering devices');
  }

  getDiscoveredDevices() {
    return Array.from(this.discoveredDevices.values());
  }

  stop() {
    if (this.localService) this.localService.stop();
    bonjour.destroy();
  }
}
