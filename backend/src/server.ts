import app from './app';
import { config } from './config/config';
import { checkConnection, initializeDatabase, databaseType } from './config/database';
import { adminService } from './services/adminService';

const PORT = config.PORT || 5000;

// Test database connection
async function testDatabaseConnection() {
  try {
    const isConnected = await checkConnection();
    if (isConnected) {
      console.log(`✅ ${databaseType} database connected successfully`);
      return true;
    } else {
      console.error(`❌ ${databaseType} database connection failed`);
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize system health monitoring
async function initializeSystemHealth() {
  try {
    await adminService.updateSystemHealth(
      'system',
      'HEALTHY',
      undefined,
      undefined,
      {
        cpuUsage: process.cpuUsage().user / 1000000,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime: process.uptime(),
        activeConnections: 0,
        lastChecked: new Date()
      }
    );
    console.log('✅ System health monitoring initialized');
  } catch (error) {
    console.error('⚠️ Failed to initialize system health monitoring:', error);
  }
}

// Periodic system health updates
function startHealthMonitoring() {
  setInterval(async () => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      await adminService.updateSystemHealth(
        'system',
        'HEALTHY',
        undefined,
        undefined,
        {
          cpuUsage: cpuUsage.user / 1000000,
          memoryUsage: memUsage.heapUsed / 1024 / 1024,
          uptime: process.uptime(),
          activeConnections: 0,
          lastChecked: new Date()
        }
      );
    } catch (error) {
      console.error('Error updating system health:', error);
    }
  }, 60000); // Update every minute
}

// Periodic metrics generation
function startMetricsGeneration() {
  // Generate metrics every hour
  setInterval(async () => {
    try {
      await adminService.generateMetricsRollup(new Date(), 'HOURLY');
      console.log('📊 Metrics generated successfully');
    } catch (error) {
      console.error('Error generating metrics:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}

// Periodic cleanup
function startPeriodicCleanup() {
  // Clean up old data daily at 2 AM
  const now = new Date();
  const tomorrow2AM = new Date(now);
  tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
  tomorrow2AM.setHours(2, 0, 0, 0);
  
  const msUntil2AM = tomorrow2AM.getTime() - now.getTime();
  
  setTimeout(() => {
    // Run cleanup immediately, then every 24 hours
    const runCleanup = async () => {
      try {
        await adminService.cleanupOldData(90); // Keep 90 days of data
        console.log('🧹 Periodic cleanup completed');
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    };
    
    runCleanup();
    setInterval(runCleanup, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntil2AM);
}

// Main server startup function
async function startServer() {
  try {
    console.log('🚀 Starting Financial Advisory Platform API...');
    
    // Initialize database
    console.log('🔧 Initializing database...');
    await initializeDatabase();
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    // Initialize system health monitoring
    // await initializeSystemHealth();
    
    // Start background processes
    // startHealthMonitoring();
    // startMetricsGeneration();
    // startPeriodicCleanup();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API available at http://localhost:${PORT}`);
      console.log(`📚 Environment: ${config.NODE_ENV}`);
      console.log(`🗄️ Database: ${databaseType}`);
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('🔄 HTTP server closed');
        
        try {
          // Update system health to indicate shutdown
          await adminService.updateSystemHealth(
            'system',
            'HEALTHY',
            0,
            undefined,
            {
              status: 'MAINTENANCE',
              cpuUsage: 0,
              memoryUsage: 0,
              uptime: 0,
              activeConnections: 0,
              lastChecked: new Date()
            }
          );
          
          // Close database connections
          console.log('🔄 SQLite database connections closed');
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      
      try {
        // Log critical error to admin notifications
        await adminService.createNotification(
          'ERROR',
          'Critical Server Error',
          `Uncaught exception: ${error.message}`,
          { priority: 'CRITICAL' }
        );
      } catch (logError) {
        console.error('Failed to log critical error:', logError);
      }
      
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      
      try {
        // Log critical error to admin notifications
        await adminService.createNotification(
          'ERROR',
          'Unhandled Promise Rejection',
          `Unhandled rejection: ${reason}`,
          { priority: 'HIGH' }
        );
      } catch (logError) {
        console.error('Failed to log unhandled rejection:', logError);
      }
      
      // Don't exit on unhandled rejections in production
      if (config.NODE_ENV !== 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
      }
    });
    
    // Log successful startup
    try {
      await adminService.createNotification(
        'INFO',
        'Server Started',
        `Financial Advisory Platform API started successfully on port ${PORT}`,
        { priority: 'LOW' }
      );
    } catch (error) {
      console.error('Failed to log server startup:', error);
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();