# Voxta SDK Development Guide

## Complete Reference for Building Voxta Integrations

**Version:** 1.0
**Last Updated:** 2025-11-30
**SDK Version:** Voxta.Sdk.Modules 1.1.4

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [SDK Types Explained](#2-sdk-types-explained)
3. [Provider SDK (Augmenting Existing Chats)](#3-provider-sdk)
4. [Modules SDK (Providing Services)](#4-modules-sdk)
5. [Client/App SDK (Owning the Chat)](#5-clientapp-sdk)
6. [WebSocket Protocol Reference](#6-websocket-protocol-reference)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Configuration Patterns](#8-configuration-patterns)
9. [Action System Deep Dive](#9-action-system-deep-dive)
10. [Audio Handling](#10-audio-handling)
11. [Common Patterns & Best Practices](#11-common-patterns--best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

Voxta is a modular AI conversation platform. The ecosystem consists of:

```
┌─────────────────────────────────────────────────────────────────┐
│                        VOXTA SERVER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   LLM    │  │   TTS    │  │   STT    │  │  Action  │        │
│  │ Service  │  │ Service  │  │ Service  │  │Inference │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODULES (Plugins)                     │   │
│  │  ImageGen │ ChatAugmentations │ Custom Services │ etc.   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   WebSocket Hub (/hub)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   CLIENT    │     │  PROVIDER   │     │   MODULE    │
   │  (App SDK)  │     │(Provider SDK)│    │(Modules SDK)│
   │             │     │             │     │             │
   │ Owns chat   │     │ Augments    │     │ Provides    │
   │ session     │     │ existing    │     │ services    │
   │             │     │ chats       │     │             │
   └─────────────┘     └─────────────┘     └─────────────┘
   Examples:           Examples:           Examples:
   - Voxta UI          - Gamepad ctrl      - ChutesAi (ImageGen)
   - Voxy              - Smart home        - Discord Bot
   - VaM Plugin        - IoT devices       - OpenWeather
   - ConsoleChat       - Auto-reply        - Custom TTS/LLM
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Session** | A chat instance with a unique `SessionId` (GUID) |
| **Chat** | Persistent conversation with history, identified by `ChatId` |
| **Character** | AI persona with personality, voice, and behavior settings |
| **Context** | Dynamic information injected into AI's knowledge |
| **Actions** | Functions the AI can invoke (character or user-triggered) |
| **Layers** | Namespaces for grouping related actions |

---

## 2. SDK Types Explained

### When to Use Each SDK

| SDK | Use Case | Owns Chat? | Example Projects |
|-----|----------|------------|------------------|
| **Provider SDK** | Add behavior to chats started by other apps | No | Smart home, gamepad feedback, auto-reply |
| **Modules SDK** | Provide services (LLM, TTS, ImageGen, Augmentations) | No | ChutesAi, Discord Bot, OpenWeather |
| **Client/App SDK** | Create front-end applications that start chats | Yes | ConsoleChat, VaM Plugin, Custom UI |

### Decision Tree

```
Do you want to CREATE and OWN chat sessions?
├── YES → Use Client/App SDK
│         (You're building a front-end like VaM, Voxy, etc.)
│
└── NO → Do you want to PROVIDE services to Voxta?
         ├── YES → Use Modules SDK
         │         (LLM, TTS, STT, ImageGen, ChatAugmentations)
         │
         └── NO → Use Provider SDK
                  (You want to REACT to chats started elsewhere)
```

---

## 3. Provider SDK

### Overview

Providers **attach to existing chats** started by other applications (Voxy, Voxta UI, VaM, etc.) to add behavior without owning the chat session.

### Project Setup

**Target Framework:** `net8.0`

**Project File (.csproj):**
```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net8.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
    </PropertyGroup>

    <ItemGroup>
        <!-- Local DLL references (from Voxta installation) -->
        <Reference Include="lib/Voxta.Model.dll"/>
        <Reference Include="lib/Voxta.Client.dll"/>
        <Reference Include="lib/Voxta.Providers.Host.dll"/>
    </ItemGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.SignalR.Client" Version="9.0.0" />
        <PackageReference Include="Microsoft.Extensions.Configuration" Version="9.0.0" />
        <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="9.0.0" />
        <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="9.0.0" />
        <PackageReference Include="Microsoft.Extensions.Http" Version="9.0.0" />
        <PackageReference Include="Microsoft.Extensions.Options.ConfigurationExtensions" Version="9.0.0" />
        <PackageReference Include="Serilog" Version="4.2.0" />
        <PackageReference Include="Serilog.Extensions.Logging" Version="8.0.0" />
        <PackageReference Include="Serilog.Settings.Configuration" Version="8.0.4" />
        <PackageReference Include="Serilog.Sinks.Console" Version="6.0.0" />
    </ItemGroup>

    <ItemGroup>
        <None Update="appsettings.json">
            <CopyToOutputDirectory>Always</CopyToOutputDirectory>
        </None>
    </ItemGroup>
</Project>
```

**Configuration (appsettings.json):**
```json
{
  "Voxta.Client": {
    "Url": "http://127.0.0.1:5384",
    "ApiKey": ""
  },
  "Voxta.Provider": {
    "Name": "MyProviderApp"
  },
  "MyProviderApp": {
    "CustomSetting": "value"
  },
  "Serilog": {
    "Using": ["Serilog.Sinks.Console"],
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:l}{NewLine}{Exception}"
        }
      }
    ],
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Voxta": "Information"
      }
    }
  }
}
```

### Entry Point (Program.cs)

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Voxta.Client;
using Voxta.Providers.Host;

// Build configuration
var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .AddJsonFile("appsettings.Development.json", optional: true)
    .Build();

// Setup services
var services = new ServiceCollection();
services.AddSingleton<IConfiguration>(configuration);

// Bind options
services.AddOptions<VoxtaClientOptions>()
    .Bind(configuration.GetSection("Voxta.Client"))
    .ValidateDataAnnotations();

// Setup logging
await using var log = new LoggerConfiguration()
    .ReadFrom.Configuration(configuration)
    .CreateLogger();
services.AddLogging(builder => builder.AddSerilog(log));

// Add HTTP client for API calls
services.AddHttpClient();

// Register your providers
services.AddVoxtaProvider(builder =>
{
    builder.AddProvider<MyProvider>();
    builder.AddProvider<AnotherProvider>();
});

// Build and run
var sp = services.BuildServiceProvider();
var runtime = sp.GetRequiredService<IProviderAppHandler>();

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

await runtime.RunAsync(cts.Token);
```

### Base Class: ProviderBase

All providers inherit from `ProviderBase`:

```csharp
public class MyProvider : ProviderBase
{
    public MyProvider(IRemoteChatSession session, ILogger<MyProvider> logger)
        : base(session, logger)
    {
    }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        // Initialize your provider here:
        // - Register actions
        // - Subscribe to messages
        // - Setup background tasks
        // - Update context
    }
}
```

### Available Properties and Methods

| Member | Type | Description |
|--------|------|-------------|
| `SessionId` | `Guid` | Current chat session identifier |
| `Logger` | `ILogger` | Structured logger instance |
| `IsBusy` | `bool` | True if AI is currently generating/speaking |
| `Send(message)` | Method | Send message immediately |
| `SendWhenFree(message)` | Method | Queue message until AI is free |
| `HandleMessage<T>(action)` | Method | Subscribe to specific message type |
| `HandleMessage(role, timing, action)` | Method | Subscribe to chat messages |
| `StartBackgroundLoop(interval, action)` | Method | Start periodic background task |
| `ConfigureAutoReply(delay, action)` | Method | Auto-trigger after user inactivity |

### Provider Examples

#### Example 1: Register and Handle Actions

```csharp
public class ActionProvider : ProviderBase
{
    public ActionProvider(IRemoteChatSession session, ILogger<ActionProvider> logger)
        : base(session, logger) { }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        // Register actions the AI can invoke
        Send(new ClientUpdateContextMessage
        {
            SessionId = SessionId,
            ContextKey = "MyActions",  // Unique key for this action set
            Actions =
            [
                new ScenarioActionDefinition
                {
                    // Unique action identifier
                    Name = "vibrate_gamepad",

                    // Layer groups related actions (for filtering)
                    Layer = "gamepad",

                    // Helps AI understand when to use this action
                    Description = "When {{ char }} wants to physically interact with {{ user }}.",

                    // Optional: Text prepended to AI response
                    Effect = new ActionEffect
                    {
                        Secret = "{{ char }} made {{ user }}'s gamepad vibrate."
                    },

                    // Optional: Arguments the AI should provide
                    Arguments =
                    [
                        new FunctionArgumentDefinition
                        {
                            Name = "strength",
                            Type = FunctionArgumentType.String,
                            Required = true,
                            Description = "Vibration strength: 'low', 'medium', or 'high'."
                        }
                    ]
                }
            ]
        });

        // Handle when action is triggered
        HandleMessage<ServerActionMessage>(OnActionTriggered);
    }

    private void OnActionTriggered(ServerActionMessage message)
    {
        // Filter by layer to only handle our actions
        if (message.Layer != "gamepad") return;

        switch (message.Value)
        {
            case "vibrate_gamepad":
                var strength = message.Arguments?
                    .FirstOrDefault(a => a.Name == "strength")?.Value ?? "medium";

                Logger.LogInformation("Vibrating gamepad: {Strength}", strength);

                // TODO: Actually vibrate the gamepad
                break;
        }
    }
}
```

#### Example 2: User Functions (Commands)

```csharp
public class UserFunctionProvider : ProviderBase
{
    public UserFunctionProvider(IRemoteChatSession session, ILogger<UserFunctionProvider> logger)
        : base(session, logger) { }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        Send(new ClientUpdateContextMessage
        {
            SessionId = SessionId,
            ContextKey = "UserFunctions",
            Actions =
            [
                new ScenarioActionDefinition
                {
                    Name = "run_diagnostic",

                    // Short description for function lists
                    ShortDescription = "run a self-diagnostic",

                    // When to trigger
                    Description = "When {{ user }} asks to run a self-diagnostic.",

                    // Only trigger if message matches this regex
                    MatchFilter = ["diagnostic"],

                    // Trigger after user message (not character)
                    Timing = FunctionTiming.AfterUserMessage,

                    // Don't auto-generate AI response (we'll handle it)
                    CancelReply = true,

                    // Only for assistant characters
                    AssistantFilter = true,
                },
                new ScenarioActionDefinition
                {
                    Name = "play_music",
                    ShortDescription = "play music",
                    Description = "When {{ user }} asks to play music.",
                    Timing = FunctionTiming.AfterUserMessage,
                    CancelReply = true,
                    AssistantFilter = true,
                    Arguments =
                    [
                        new FunctionArgumentDefinition
                        {
                            Name = "music_search_query",
                            Description = "The search query for music",
                            Required = true,
                            Type = FunctionArgumentType.String,
                        }
                    ],
                }
            ]
        });

        HandleMessage<ServerActionMessage>(OnAction);
    }

    private void OnAction(ServerActionMessage message)
    {
        // Only handle user-initiated actions
        if (message.Role != ChatMessageRole.User) return;

        switch (message.Value)
        {
            case "run_diagnostic":
                Logger.LogInformation("Running diagnostic...");

                // Send response back to chat
                Send(new ClientSendMessage
                {
                    SessionId = SessionId,
                    DoUserActionInference = false,  // Prevent loop!
                    CharacterResponsePrefix = "[Diagnostic completed successfully]"
                });
                break;

            case "play_music":
                if (!message.TryGetArgument("music_search_query", out var query))
                    query = "random";

                Logger.LogInformation("Playing: {Query}", query);

                Send(new ClientSendMessage
                {
                    SessionId = SessionId,
                    DoUserActionInference = false,
                    Text = $"/note Playing \"{query}\" now."
                });
                break;
        }
    }
}
```

#### Example 3: Background Context Updates

```csharp
public class BackgroundContextProvider : ProviderBase
{
    private double _lastTemperature;

    public BackgroundContextProvider(IRemoteChatSession session, ILogger<BackgroundContextProvider> logger)
        : base(session, logger) { }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        // Initial context update
        _lastTemperature = await GetTemperatureAsync();
        UpdateTemperatureContext(_lastTemperature);

        // Start periodic updates every 10 seconds
        StartBackgroundLoop(TimeSpan.FromSeconds(10), CheckTemperature);
    }

    private async Task CheckTemperature()
    {
        var temp = await GetTemperatureAsync();
        var diff = Math.Abs(temp - _lastTemperature);

        if (diff <= 0.5) return;  // Ignore small changes

        Logger.LogInformation("Temperature changed: {Temp}°C", temp);
        UpdateTemperatureContext(temp);

        // Urgent notification (interrupts AI)
        if (diff > 2)
        {
            Send(new ClientSendMessage
            {
                SessionId = SessionId,
                Text = $"[URGENT: Temperature changed to {temp}°C]"
            });
        }
        // Normal notification (waits for AI to finish)
        else if (diff > 1)
        {
            SendWhenFree(new ClientSendMessage
            {
                SessionId = SessionId,
                Text = $"[Temperature is now {temp}°C]"
            });
        }
        // Optional notification (only if AI is idle)
        else if (!IsBusy)
        {
            Send(new ClientSendMessage
            {
                SessionId = SessionId,
                Text = $"[Temperature adjusted to {temp}°C]"
            });
        }

        _lastTemperature = temp;
    }

    private void UpdateTemperatureContext(double temp)
    {
        Send(new ClientUpdateContextMessage
        {
            SessionId = SessionId,
            ContextKey = "Environment/Temperature",
            Contexts = [new() { Text = $"Room temperature is {temp}°C" }]
        });
    }

    private Task<double> GetTemperatureAsync()
    {
        // TODO: Read from actual sensor
        return Task.FromResult(22.5 + Random.Shared.NextDouble() * 2);
    }
}
```

#### Example 4: Auto-Reply on Inactivity

```csharp
public class AutoReplyProvider : ProviderBase
{
    private readonly int _delayMs;

    public AutoReplyProvider(
        IRemoteChatSession session,
        ILogger<AutoReplyProvider> logger,
        IOptions<MyOptions> options)
        : base(session, logger)
    {
        _delayMs = options.Value.AutoReplyDelay;
    }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        // Auto-reply after user inactivity
        ConfigureAutoReply(TimeSpan.FromMilliseconds(_delayMs), OnAutoReply);
    }

    private void OnAutoReply()
    {
        Logger.LogInformation("Auto-replying after {Delay}ms", _delayMs);

        Send(new ClientSendMessage
        {
            SessionId = SessionId,
            Text = "[{{ char }} continues the conversation]"
        });
    }
}
```

#### Example 5: Parse Commands from AI Speech

```csharp
public class CommandParserProvider : ProviderBase
{
    private readonly ISimpleCommandsParser _parser;

    public CommandParserProvider(
        IRemoteChatSession session,
        ILogger<CommandParserProvider> logger,
        ISimpleCommandsParser parser)
        : base(session, logger)
    {
        _parser = parser;
    }

    protected override async Task OnStartAsync()
    {
        await base.OnStartAsync();

        // Listen to character speech
        HandleMessage(
            ChatMessageRole.Assistant,
            RemoteChatMessageTiming.Spoken,
            OnCharacterSpoke
        );
    }

    private void OnCharacterSpoke(RemoteChatMessage message)
    {
        // Look for commands like [device speed=5]
        if (!_parser.TryParse(message.Text, out var command))
            return;

        switch (command.Name)
        {
            case "device":
                if (command.Arguments.TryGetValue("speed", out var speedStr)
                    && double.TryParse(speedStr, out var speed))
                {
                    speed = Math.Clamp(speed, 0, 10);
                    Logger.LogInformation("Device speed: {Speed}", speed);

                    // Update context so AI knows current state
                    Send(new ClientUpdateContextMessage
                    {
                        SessionId = SessionId,
                        ContextKey = "Device/Speed",
                        Contexts = [new() { Text = $"Device speed is {speed}/10" }]
                    });
                }
                break;
        }
    }
}
```

---

## 4. Modules SDK

### Overview

Modules provide **services** to the Voxta ecosystem: LLM inference, TTS, STT, image generation, and chat augmentations.

### Project Setup

**Target Framework:** `net9.0` or `net10.0`

**Project File (.csproj):**
```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
    </PropertyGroup>

    <ItemGroup>
        <!-- This is the ONLY Voxta dependency needed -->
        <PackageReference Include="Voxta.Sdk.Modules" Version="1.1.4" />
    </ItemGroup>
</Project>
```

### Module Entry Point

Every module must implement `IVoxtaModule`:

```csharp
using Voxta.Abstractions.Modules;
using Voxta.Abstractions.Registration;
using Voxta.Model.Shared;

[UsedImplicitly]
public class VoxtaModule : IVoxtaModule
{
    public const string ServiceName = "MyModule";

    public void Configure(IVoxtaModuleBuilder builder)
    {
        // 1. Register the service definition
        builder.Register(new ServiceDefinition
        {
            ServiceName = ServiceName,
            Label = "My Module",
            Notes = "Description of what this module does.",
            HelpLink = "https://example.com/docs",

            // What services does this module provide?
            Supports = new()
            {
                { ServiceTypes.ImageGen, ServiceDefinitionCategoryScore.High },
                // Add more: LargeLanguageModel, TextToSpeech, SpeechToText,
                //          ActionInference, ChatAugmentations
            },

            Pricing = ServiceDefinitionPricing.PerUse,  // Free, Medium, PerUse
            Hosting = ServiceDefinitionHosting.Remote,   // Builtin, Remote, Online

            Experimental = false,
            CanBeInstalledByAdminsOnly = false,
            SupportsExplicitContent = true,
            Recommended = true,

            // Configuration UI
            ModuleConfigurationProviderType = typeof(ModuleConfigurationProvider),
            ModuleConfigurationFieldsRequiringReload = ModuleConfigurationProvider.FieldsRequiringReload,
        });

        // 2. Register service implementations
        builder.AddImageGenService<MyImageGenService>(ServiceName);
        // Or: builder.AddTextGenService<MyLLMService>(ServiceName);
        // Or: builder.AddTextToSpeechService<MyTTSService>(ServiceName);
        // Or: builder.AddSpeechToTextService<MySTTService>(ServiceName);
        // Or: builder.AddChatAugmentationsService<MyAugmentationService>(ServiceName);

        // 3. Register dependencies
        builder.Services.AddHttpClient();
        builder.Services.AddSingleton<IMyHelper, MyHelper>();
    }
}
```

### Service Types

| ServiceType | Interface | Purpose |
|-------------|-----------|---------|
| `LargeLanguageModel` | `ITextGenService` | Text/chat generation |
| `SpeechToText` | `ISpeechToTextService` | Audio transcription |
| `TextToSpeech` | `ITextToSpeechService` | Voice synthesis |
| `ImageGen` | `IImageGenService` | Image generation |
| `ActionInference` | `IActionInferenceService` | Action selection |
| `ChatAugmentations` | `IChatAugmentationsService` | Chat behavior modification |

### Configuration Provider

```csharp
using Voxta.Abstractions.Registration;
using Voxta.Abstractions.Security;
using Voxta.Model.Shared.Forms;

public class ModuleConfigurationProvider : ModuleConfigurationProviderBase, IModuleConfigurationProvider
{
    // Fields that require service reload when changed
    public static string[] FieldsRequiringReload => [ApiKey.Name];

    // Define configuration fields
    public static readonly FormTextField ApiKey = new()
    {
        Name = "ApiKey",
        Label = "API Key",
        Text = "Your API key for the service.",
        IsRequired = true,
        Type = FormTextFieldType.Secret  // Masked input
    };

    public static readonly FormTextField DefaultModel = new()
    {
        Name = "DefaultModel",
        Label = "Default Model",
        Text = "The model to use by default.",
        DefaultValue = "default-model"
    };

    public static readonly FormBooleanField EnableFeature = new()
    {
        Name = "EnableFeature",
        Label = "Enable Feature",
        Text = "Enable this experimental feature.",
        DefaultValue = false
    };

    public Task<FormField[]> GetModuleConfigurationFieldsAsync(
        IAuthenticationContext auth,
        ISettingsSource settings,
        CancellationToken cancellationToken)
    {
        var fields = FormBuilder.Build(
            FormTitleField.Create("My Module Settings"),
            ApiKey,
            DefaultModel,
            EnableFeature
        );
        return Task.FromResult(fields);
    }
}
```

### Image Generation Service Example

```csharp
using Voxta.Abstractions.Services;
using Voxta.Abstractions.Services.ImageGen;

[UsedImplicitly]
public class MyImageGenService : ServiceBase, IImageGenService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public MyImageGenService(
        IHttpClientFactory httpClientFactory,
        ILogger<MyImageGenService> logger)
        : base(logger)
    {
        _httpClientFactory = httpClientFactory;
    }

    // Instructions shown to the LLM for prompt generation
    public string PromptingInstructions =>
        "Generate detailed image descriptions. Specify style, lighting, and composition.";

    // Called when service is selected
    public Task WarmupAsync(CancellationToken cancellationToken)
    {
        // Pre-load models, validate API keys, etc.
        return Task.CompletedTask;
    }

    // Main generation method
    public async Task<GenerateImageResult> GenerateAsync(
        GenerateImageRequest request,
        IInferenceLogger inferenceLogger,
        CancellationToken cancellationToken)
    {
        // Get configuration
        var apiKey = ModuleConfiguration.Get(ModuleConfigurationProvider.ApiKey);
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("API key not configured.");

        var model = request.Model
            ?? ModuleConfiguration.Get(ModuleConfigurationProvider.DefaultModel)
            ?? "default";

        inferenceLogger.AppendLog($"Generating with model '{model}'");
        inferenceLogger.AppendLog($"Prompt: {request.Prompt}");

        var client = _httpClientFactory.CreateClient();

        // Make API call
        var response = await client.PostAsJsonAsync(
            "https://api.example.com/generate",
            new
            {
                model,
                prompt = request.Prompt,
                negative_prompt = request.NegativePrompt,
                width = request.Width ?? 1024,
                height = request.Height ?? 1024,
                steps = request.Steps ?? 30,
                cfg_scale = request.CfgScale ?? 7.0
            },
            cancellationToken
        );

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ApiResponse>(cancellationToken);

        return new GenerateImageResult
        {
            Url = result.ImageUrl,
            Seed = result.Seed.ToString()
        };
    }
}
```

### Chat Augmentations

Chat augmentations modify chat behavior through various interfaces:

| Interface | Purpose |
|-----------|---------|
| `IActionInferenceAugmentation` | Handle action inference |
| `IChatScriptEventsAugmentation` | React to chat lifecycle events |
| `IChatPreProcessAugmentation` | Modify text before processing |
| `IChatPostProcessAugmentation` | Modify text after processing |

#### Augmentation Service Factory

```csharp
public class MyChatAugmentationsService : ServiceBase, IChatAugmentationsService
{
    private readonly ILoggerFactory _loggerFactory;

    public MyChatAugmentationsService(
        ILogger<MyChatAugmentationsService> logger,
        ILoggerFactory loggerFactory)
        : base(logger)
    {
        _loggerFactory = loggerFactory;
    }

    public async Task<IChatAugmentationServiceInstanceBase[]> CreateInstanceAsync(
        IChatSessionChatAugmentationApi session,
        IAuthenticationContext auth,
        CancellationToken cancellationToken)
    {
        // Use holder for proper cleanup on errors
        await using var instances = new ChatAugmentationServiceInitializationHolder();

        // Create instances based on configuration
        if (session.IsAugmentationEnabled("my_augmentation"))
        {
            if (ModuleConfiguration.GetRequired(ModuleConfigurationProvider.EnableFeature))
            {
                instances.Add(new MyActionAugmentation(
                    session,
                    _loggerFactory.CreateLogger<MyActionAugmentation>()
                ));
            }
        }

        return instances.Acquire();
    }
}
```

#### Action Inference Augmentation

```csharp
public class MyActionAugmentation : IActionInferenceAugmentation
{
    private readonly IChatSessionChatAugmentationApi _session;
    private readonly ILogger _logger;

    public MyActionAugmentation(
        IChatSessionChatAugmentationApi session,
        ILogger<MyActionAugmentation> logger)
    {
        _session = session;
        _logger = logger;
    }

    // Required service types for this augmentation
    public ServiceTypes[] GetRequiredServiceTypes() => [ServiceTypes.ActionInference];

    // Augmentation identifiers this instance handles
    public string[] GetAugmentationNames() => ["my_augmentation"];

    // Register actions when chat starts
    public IEnumerable<ClientUpdateContextMessage> RegisterChatContext()
    {
        return
        [
            new ClientUpdateContextMessage
            {
                ContextKey = "MyAugmentation",
                SessionId = _session.SessionId,
                Actions =
                [
                    new ScenarioActionDefinition
                    {
                        Name = "get_time",
                        ShortDescription = "get current time",
                        Description = "When the user asks for the current time.",
                        MatchFilter = ["time", "clock", "hour"],
                        Timing = FunctionTiming.AfterUserMessage,
                        CancelReply = true,
                    }
                ]
            }
        ];
    }

    // Handle action when triggered
    public async ValueTask<bool> TryHandleActionInference(
        ChatMessageData? message,
        ServerActionMessage action,
        CancellationToken cancellationToken)
    {
        if (action.ContextKey != "MyAugmentation")
            return false;

        switch (action.Value)
        {
            case "get_time":
                _logger.LogInformation("Time requested");

                // Send secret info to AI
                await _session.SendSecretAsync(
                    $"Current time: {DateTime.Now:HH:mm:ss}",
                    cancellationToken
                );

                // Trigger AI response
                await _session.TriggerReplyAsync(cancellationToken);
                return true;

            default:
                return false;
        }
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
```

#### Script Events Augmentation

```csharp
public class MyScriptEventsAugmentation : IChatScriptEventsAugmentation
{
    private readonly IChatSessionChatAugmentationApi _session;
    private readonly ILogger _logger;

    public MyScriptEventsAugmentation(
        IChatSessionChatAugmentationApi session,
        ILogger logger)
    {
        _session = session;
        _logger = logger;
    }

    public ServiceTypes[] GetRequiredServiceTypes() => [ServiceTypes.ActionInference];
    public string[] GetAugmentationNames() => ["my_augmentation"];

    public Task OnChatScriptEvent(
        IActionScriptEvent e,
        ChatMessageData? message,
        ICharacterOrUserData character,
        CancellationToken cancellationToken)
    {
        switch (e)
        {
            case InitActionScriptEvent:
                _logger.LogInformation("Chat initialized");
                break;

            case StartActionScriptEvent start:
                _logger.LogInformation("Chat started (bootstrap: {Has})", start.HasBootstrapMessages);
                break;

            case UserMessageReceivedActionScriptEvent userMsg:
                _logger.LogInformation("User said: {Text}", userMsg.Message);
                // Optionally modify: userMsg.RewriteUserMessage = "modified text";
                break;

            case GeneratingActionScriptEvent gen:
                _logger.LogInformation("Generating for {Char}", gen.Character.Name);
                break;

            case GeneratingCompleteActionScriptEvent:
                _logger.LogInformation("Generation complete");
                break;

            case SpeechStartActionScriptEvent speech:
                _logger.LogInformation("{Char} started speaking", speech.Character.Name);
                break;

            case SpeechCompleteActionScriptEvent speechEnd:
                _logger.LogInformation("{Char} finished speaking", speechEnd.Character.Name);
                break;

            case BeforeSelectActionInferenceActionScriptEvent before:
                _logger.LogInformation("Selecting action on layer: {Layer}", before.Layer);
                // Filter actions: before.Actions = before.Actions.Where(...).ToArray();
                break;

            case ActionInferenceSelectedActionScriptEvent selected:
                _logger.LogInformation("Action selected: {Action}", selected.Action);
                break;

            case TranscriptionStartedScriptEvent:
                _logger.LogInformation("Transcription started");
                break;

            case TranscriptionFinishedScriptEvent transcription:
                _logger.LogInformation("Transcribed: {Text}", transcription.Text);
                break;

            case TypingStartScriptEvent:
                _logger.LogInformation("User typing");
                break;

            case TypingEndScriptEvent:
                _logger.LogInformation("User stopped typing");
                break;
        }

        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
```

#### Pre/Post Processing Augmentation

```csharp
public class MyProcessingAugmentation : IChatPreProcessAugmentation, IChatPostProcessAugmentation
{
    private readonly IChatSessionChatAugmentationApi _session;

    public MyProcessingAugmentation(IChatSessionChatAugmentationApi session)
    {
        _session = session;
    }

    public ServiceTypes[] GetRequiredServiceTypes() => [ServiceTypes.ActionInference];
    public string[] GetAugmentationNames() => ["my_augmentation"];

    // Modify text BEFORE it goes to the LLM
    public ValueTask<string> PreProcessTextAsync(
        ChatMessageRole role,
        string text,
        CancellationToken cancellationToken)
    {
        if (role == ChatMessageRole.User)
        {
            // Add timestamp to user messages
            var timestamp = DateTime.Now.ToString(_session.MainCharacter.Culture);
            return ValueTask.FromResult($"[{timestamp}] {text}");
        }
        return ValueTask.FromResult(text);
    }

    // Modify text AFTER it comes from the LLM
    public ValueTask<string> PostProcessTextAsync(
        ChatMessageRole role,
        string text,
        CancellationToken cancellationToken)
    {
        if (role == ChatMessageRole.Assistant)
        {
            // Example: Replace certain words
            text = Regex.Replace(text, @"\bAI\b", "assistant", RegexOptions.IgnoreCase);
        }
        return ValueTask.FromResult(text);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
```

### Background Service Module (Discord Bot Example)

```csharp
public class VoxtaModule : IVoxtaModule
{
    public const string ServiceName = "DiscordBot";

    public void Configure(IVoxtaModuleBuilder builder)
    {
        builder.Register(new ModuleDefinition
        {
            ServiceName = ServiceName,
            Label = "Discord Bot",
            Notes = "Bridges Discord to Voxta chats.",
            Experimental = true,
            CanBeInstalledByAdminsOnly = true,
            Supports = new() { },  // No specific AI service type
            Pricing = ServiceDefinitionPricing.Free,
            Hosting = ServiceDefinitionHosting.Builtin,
            ModuleConfigurationProviderType = typeof(ModuleConfigurationProvider),
        });

        // Register as background service
        builder.Services.AddHostedService<DiscordBotService>();
    }
}

public class DiscordBotService : BackgroundService
{
    private readonly IChatFactory _chatFactory;
    private readonly ILogger<DiscordBotService> _logger;

    public DiscordBotService(
        IChatFactory chatFactory,
        ILogger<DiscordBotService> logger)
    {
        _chatFactory = chatFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var token = Environment.GetEnvironmentVariable("DISCORD_TOKEN");
        if (string.IsNullOrEmpty(token))
        {
            _logger.LogWarning("No Discord token. Service disabled.");
            return;
        }

        // Initialize Discord client and handle messages...
        await Task.Delay(-1, stoppingToken);
    }
}
```

---

## 5. Client/App SDK

### Overview

Clients **own chat sessions**. They create chats, manage the connection, handle audio I/O, and coordinate the conversation flow.

### Project Setup

**Target Framework:** `net10.0` (or `net10.0-windows` for Windows-specific features)

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net10.0-windows</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
    </PropertyGroup>

    <ItemGroup>
        <!-- Local reference to Voxta.Client.dll -->
        <Reference Include="Voxta.Client">
            <HintPath>libs\Voxta.Client.dll</HintPath>
        </Reference>
    </ItemGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="10.0.0" />
        <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="10.0.0" />
        <PackageReference Include="Microsoft.Extensions.Http" Version="10.0.0" />
        <PackageReference Include="NAudio.Wasapi" Version="2.2.1"/>
    </ItemGroup>
</Project>
```

### Entry Point

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Voxta.Client;

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .Build();

var services = new ServiceCollection();
services.AddSingleton<IConfiguration>(configuration);
services.AddHttpClient();
services.AddLogging();

// Add Voxta API client
services.AddVoxtaApiClient();

// Add authentication
services.AddTransient<VoxtaTokenProvider>();
services.AddSingleton<IDeviceAuthorization, DeviceAuthorization>();
services.AddSingleton<ITokenStorage, TokenStorage>();

// Add your app
services.AddSingleton<MyApp>();

var provider = services.BuildServiceProvider();

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

var app = provider.GetRequiredService<MyApp>();
await app.RunAsync(cts.Token);
```

### WebSocket Client Creation

```csharp
public class MyApp
{
    private readonly IVoxtaWebsocketsClientFactory _clientFactory;
    private readonly VoxtaTokenProvider _tokenProvider;
    private IVoxtaWebsocketsClient _client;

    public MyApp(
        IVoxtaWebsocketsClientFactory clientFactory,
        VoxtaTokenProvider tokenProvider)
    {
        _clientFactory = clientFactory;
        _tokenProvider = tokenProvider;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        // Authenticate first
        _tokenProvider.Token = await AuthenticateAsync(ct);

        // Create WebSocket client with capabilities
        _client = _clientFactory.Create(
            new ClientAuthenticateMessage
            {
                Client = "MyApp",
                ClientVersion = "1.0.0",
                Scope = [ClientScopes.AppRole],
                Capabilities = new ClientCapabilities
                {
                    // Audio output: None, Url, LocalFile
                    AudioOutput = AudioOutputClientCapabilities.Url,
                    AcceptedAudioContentTypes = ["audio/x-wav", "audio/mpeg"],

                    // Audio input: None, WebSocketStream
                    AudioInput = AudioInputClientCapabilities.WebSocketStream,

                    // Vision: None, Url, Base64
                    VisionCapture = VisionCaptureClientCapabilities.None,
                }
            },
            _tokenProvider
        );

        // Subscribe to events
        _client.OnMessageReceived += OnMessage;
        _client.OnError += OnError;

        // Connect
        await _client.ConnectAsync(ct);

        // Main loop...
    }
}
```

### Device Code Authentication

```csharp
private async Task<string> AuthenticateAsync(CancellationToken ct)
{
    // Try to load existing token
    var token = _tokenStorage.RetrieveToken();
    if (await _deviceAuth.ValidateTokenAsync(token, ct))
        return token;

    // Get device code for user authorization
    var deviceCode = await _deviceAuth.GetDeviceCodeAsync("MyApp", ct);

    Console.WriteLine("Please authorize this device:");
    Console.WriteLine($"  Code: {deviceCode.UserCode}");
    Console.WriteLine($"  URL:  {deviceCode.VerificationUrl}");

    // Wait for user to authorize in browser
    token = await _deviceAuth.WaitForTokenAsync(deviceCode, ct);

    // Save for next time
    _tokenStorage.SaveToken(token);

    return token;
}
```

### Message Handling

```csharp
private void OnMessage(object? sender, ServerMessage e)
{
    switch (e)
    {
        // Connection established
        case ServerWelcomeMessage welcome:
            Console.WriteLine($"Welcome, {welcome.User.Name}!");
            if (welcome.Assistant != null)
            {
                // Start chat with default assistant
                _client.Send(new ClientStartChatMessage
                {
                    CharacterId = welcome.Assistant.Id,
                    // Optional custom context
                    Contexts = [new() { Text = "Custom context..." }],
                    // Optional actions
                    Actions = myActions,
                });
            }
            break;

        // Chat is loading
        case ServerChatStartingMessage:
            Console.WriteLine("Loading chat...");
            break;

        // Chat ready
        case ServerChatStartedMessage started:
            _sessionId = started.SessionId;
            _chatId = started.ChatId;
            Console.WriteLine($"Chat started: {started.ChatId}");

            // Check available services
            if (started.Services.TextToSpeech == null)
                Console.WriteLine("Warning: TTS disabled");
            if (started.Services.SpeechToText == null)
                Console.WriteLine("Warning: STT disabled");
            if (started.Services.ActionInference == null)
                Console.WriteLine("Warning: Actions disabled");
            break;

        // AI generating response
        case ServerReplyGeneratingMessage:
            Console.WriteLine("Thinking...");
            break;

        // AI response starting
        case ServerReplyStartMessage start:
            _currentMessageId = start.MessageId;
            break;

        // AI response chunk (text + audio)
        case ServerReplyChunkMessage chunk:
            Console.Write(chunk.Text);
            if (!string.IsNullOrEmpty(chunk.AudioUrl))
            {
                // Play audio...
                // Then notify server:
                _client.Send(new ClientSpeechPlaybackStartMessage
                {
                    SessionId = chunk.SessionId,
                    MessageId = chunk.MessageId,
                    StartIndex = chunk.StartIndex,
                    EndIndex = chunk.EndIndex,
                    Duration = audioDuration.TotalSeconds,
                });
            }
            break;

        // AI response complete
        case ServerReplyEndMessage end:
            Console.WriteLine();
            // Notify playback complete
            _client.Send(new ClientSpeechPlaybackCompleteMessage
            {
                SessionId = _sessionId,
                MessageId = end.MessageId,
            });
            break;

        // Speech recognition events
        case ServerSpeechRecognitionStartMessage:
            Console.WriteLine("Listening...");
            break;

        case ServerSpeechRecognitionPartialMessage partial:
            Console.WriteLine($"  (heard: {partial.Text})");
            break;

        case ServerSpeechRecognitionEndMessage final:
            Console.WriteLine($"You said: {final.Text}");
            break;

        // Action triggered
        case ServerActionMessage action:
            Console.WriteLine($"Action: {action.Value}");
            HandleAction(action);
            break;

        // Errors
        case ServerErrorMessage error:
            Console.Error.WriteLine($"Error: {error.Message}");
            break;

        // Recording control
        case ServerRecordingRequestMessage recording:
            if (recording.Enabled)
                StartMicRecording();
            else
                StopMicRecording();
            break;
    }
}
```

### Sending Messages

```csharp
// Send user text message
_client.Send(new ClientSendMessage
{
    SessionId = _sessionId,
    Text = "Hello!",
    DoReply = true,                    // Generate AI response
    DoUserActionInference = true,      // Check for user actions
    DoCharacterActionInference = false // Don't check character actions
});

// Send with response prefix
_client.Send(new ClientSendMessage
{
    SessionId = _sessionId,
    Text = "/note The user completed a task",
    CharacterResponsePrefix = "[Acknowledging completion]",
    DoUserActionInference = false,
});

// Update context
_client.Send(new ClientUpdateContextMessage
{
    SessionId = _sessionId,
    ContextKey = "GameState",
    Contexts = [new() { Text = "Player has 100 health points." }],
});

// Stop current chat
_client.Send(new ClientStopChatMessage());
```

### Audio Input (Microphone Streaming)

```csharp
public class MicrophoneManager : IDisposable
{
    private ClientWebSocket _audioSocket;
    private WaveInEvent _waveIn;
    private bool _ready;

    public async Task ConnectAsync(IVoxtaTokenProvider tokenProvider, string baseUrl)
    {
        _audioSocket = new ClientWebSocket();
        _audioSocket.Options.SetRequestHeader("Authorization", $"Bearer {tokenProvider.GetToken()}");

        var wsUrl = baseUrl.Replace("http://", "ws://") + "/ws/audio/input/stream";
        await _audioSocket.ConnectAsync(new Uri(wsUrl), CancellationToken.None);

        // Send audio specifications
        var specs = new AudioInputSpecifications
        {
            SampleRate = 16000,
            Channels = 1,
            BitsPerSample = 16,
            BufferMilliseconds = 30
        };
        var json = JsonSerializer.Serialize(specs);
        await _audioSocket.SendAsync(
            Encoding.UTF8.GetBytes(json),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );

        // Setup NAudio recording
        _waveIn = new WaveInEvent
        {
            WaveFormat = new WaveFormat(16000, 1),
            BufferMilliseconds = 30
        };
        _waveIn.DataAvailable += OnAudioData;

        _ready = true;
    }

    private async void OnAudioData(object? sender, WaveInEventArgs e)
    {
        if (!_ready || e.BytesRecorded == 0) return;

        await _audioSocket.SendAsync(
            new ArraySegment<byte>(e.Buffer, 0, e.BytesRecorded),
            WebSocketMessageType.Binary,
            true,
            CancellationToken.None
        );
    }

    public void StartRecording() => _waveIn?.StartRecording();
    public void StopRecording() => _waveIn?.StopRecording();

    public void Dispose()
    {
        _ready = false;
        _waveIn?.Dispose();
        _audioSocket?.Dispose();
    }
}
```

### Audio Output (TTS Playback)

```csharp
public class AudioPlayer
{
    private readonly IVoxtaApiClient _apiClient;
    private readonly BlockingCollection<ServerReplyChunkMessage> _queue = new();

    public event EventHandler<(ServerReplyChunkMessage, TimeSpan)>? OnChunkPlayed;
    public event EventHandler<Guid>? OnMessageComplete;

    public AudioPlayer(IVoxtaApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public void QueueChunk(ServerReplyChunkMessage chunk)
    {
        _queue.Add(chunk);
    }

    public void MarkComplete()
    {
        _queue.CompleteAdding();
    }

    public async Task PlayAsync(CancellationToken ct)
    {
        Guid? currentMessageId = null;

        foreach (var chunk in _queue.GetConsumingEnumerable(ct))
        {
            currentMessageId = chunk.MessageId;

            if (string.IsNullOrEmpty(chunk.AudioUrl))
            {
                OnChunkPlayed?.Invoke(this, (chunk, TimeSpan.Zero));
                continue;
            }

            // Download and play audio
            var stream = await _apiClient.GetAudioStreamAsync(chunk.AudioUrl, ct);
            using var waveOut = new WaveOutEvent();
            await using var reader = new StreamMediaFoundationReader(stream);

            waveOut.Init(reader);
            waveOut.Play();

            OnChunkPlayed?.Invoke(this, (chunk, reader.TotalTime));

            while (waveOut.PlaybackState == PlaybackState.Playing)
                await Task.Delay(50, ct);
        }

        if (currentMessageId.HasValue)
            OnMessageComplete?.Invoke(this, currentMessageId.Value);
    }
}
```

---

## 6. WebSocket Protocol Reference

### Connection

- **Endpoint:** `ws://{host}:{port}/hub` (SignalR)
- **Default:** `ws://127.0.0.1:5384/hub`
- **Protocol:** SignalR JSON

### Message Format

All messages use SignalR protocol with `$type` discriminator:

```json
{
  "$type": "messageType",
  "field1": "value1",
  "field2": "value2"
}
```

### Client Messages (Client → Server)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `authenticate` | Initial authentication | `client`, `clientVersion`, `scope`, `capabilities` |
| `startChat` | Start new chat session | `characterId`, `scenarioId?`, `contexts?`, `actions?` |
| `stopChat` | End current chat | - |
| `send` | Send user message | `sessionId`, `text`, `doReply`, `doUserActionInference`, `doCharacterActionInference` |
| `updateContext` | Update context/actions | `sessionId`, `contextKey`, `contexts?`, `actions?`, `setFlags?` |
| `speechPlaybackStart` | Notify speech started | `sessionId`, `messageId`, `startIndex`, `endIndex`, `duration` |
| `speechPlaybackComplete` | Notify speech ended | `sessionId`, `messageId` |
| `revert` | Undo last message | `sessionId` |
| `loadCharactersList` | Request characters | - |
| `loadScenariosList` | Request scenarios | - |
| `loadChatsList` | Request chat history | `characterId`, `scenarioId?` |
| `deleteChat` | Delete a chat | `chatId` |
| `registerApp` | Register app info | `clientVersion`, `label`, `scriptSnippets?` |

### Server Messages (Server → Client)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `welcome` | Auth successful | `user`, `assistant?`, `voxtaServerVersion`, `apiVersion` |
| `authenticationRequired` | Need to create profile | - |
| `error` | General error | `message`, `code?`, `details?` |
| `chatSessionError` | Chat-specific error | `message`, `code?`, `serviceName?` |
| `charactersListLoaded` | Characters list | `characters[]` |
| `scenariosListLoaded` | Scenarios list | `scenarios[]` |
| `chatsListLoaded` | Chats list | `chats[]` |
| `chatStarting` | Chat loading | - |
| `chatLoading` | Chat loading progress | - |
| `chatStarted` | Chat ready | `sessionId`, `chatId`, `characters[]`, `services`, `context` |
| `chatClosed` | Chat ended | `chatId` |
| `replyGenerating` | AI thinking | `sessionId`, `messageId`, `senderId`, `thinkingSpeechUrl?` |
| `replyStart` | Response starting | `sessionId`, `messageId`, `senderId` |
| `replyChunk` | Response chunk | `sessionId`, `messageId`, `text`, `audioUrl?`, `startIndex`, `endIndex`, `senderId`, `isNarration`, `audioGapMs?` |
| `replyEnd` | Response complete | `sessionId`, `messageId`, `senderId` |
| `replyCancelled` | Response cancelled | `sessionId`, `messageId` |
| `speechRecognitionStart` | STT started | - |
| `speechRecognitionPartial` | STT partial | `text` |
| `speechRecognitionEnd` | STT final | `text` |
| `action` | Action triggered | `value`, `layer?`, `role`, `contextKey?`, `arguments[]?` |
| `appTrigger` | App-specific trigger | `name`, `arguments[]` |
| `contextUpdated` | Context changed | `flags[]` |
| `recordingRequest` | Recording control | `enabled` |
| `recordingStatus` | Recording state | `enabled` |
| `update` | Message updated | `text`, `role` |
| `interruptSpeech` | Stop playback | - |
| `chatFlow` | Flow state changed | `state` |
| `chatPaused` | Chat paused | - |
| `memoryUpdated` | Memory changed | - |
| `chatParticipantsUpdated` | Participants changed | - |
| `moduleRuntimeInstances` | Modules loading | - |
| `configuration` | Server config | `configurations[]` |

### Audio WebSocket

- **Endpoint:** `ws://{host}:{port}/ws/audio/input/stream`
- **First Message:** JSON specifications
- **Subsequent:** Binary PCM audio data

```json
{
  "sampleRate": 16000,
  "channels": 1,
  "bitsPerSample": 16,
  "bufferMilliseconds": 30
}
```

---

## 7. Authentication & Authorization

### Scopes

| Scope | Description |
|-------|-------------|
| `role:app` | Full application access (start chats, etc.) |
| `role:provider` | Provider access (attach to chats) |

### Device Code Flow

1. Request device code: `GET /api/auth/device?client={name}`
2. Display code to user
3. User visits verification URL and enters code
4. Poll for token: `GET /api/auth/device/token?deviceCode={code}`
5. Use token in `Authorization: Bearer {token}` header

### Token Storage (Windows)

```csharp
public class TokenStorage : ITokenStorage
{
    private readonly string _path = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "MyApp", "token.dat"
    );

    public void SaveToken(string token)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var encrypted = ProtectedData.Protect(
            Encoding.UTF8.GetBytes(token),
            null,
            DataProtectionScope.CurrentUser
        );
        File.WriteAllBytes(_path, encrypted);
    }

    public string? RetrieveToken()
    {
        if (!File.Exists(_path)) return null;
        var encrypted = File.ReadAllBytes(_path);
        var decrypted = ProtectedData.Unprotect(
            encrypted, null, DataProtectionScope.CurrentUser
        );
        return Encoding.UTF8.GetString(decrypted);
    }
}
```

---

## 8. Configuration Patterns

### appsettings.json Structure

```json
{
  "Voxta.Client": {
    "Url": "http://127.0.0.1:5384",
    "ApiKey": ""
  },
  "Voxta.Provider": {
    "Name": "MyProvider"
  },
  "MyApp": {
    "Setting1": "value1",
    "Setting2": 123
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Voxta": "Debug"
      }
    }
  }
}
```

### Options Pattern

```csharp
// Define options class
public class MyAppOptions
{
    [Required]
    public required string Setting1 { get; init; }
    public int Setting2 { get; init; } = 100;
}

// Register in DI
services.AddOptions<MyAppOptions>()
    .Bind(configuration.GetSection("MyApp"))
    .ValidateDataAnnotations();

// Inject in constructor
public class MyService(IOptions<MyAppOptions> options)
{
    private readonly MyAppOptions _options = options.Value;
}
```

### Module Configuration UI

```csharp
// Field types available:
FormTextField          // Text input
FormTextAreaField      // Multi-line text
FormBooleanField       // Checkbox
FormNumberField        // Numeric input
FormSelectField        // Dropdown
FormMultiSelectField   // Multi-select
FormTitleField         // Section header

// Secret fields (masked)
new FormTextField
{
    Name = "ApiKey",
    Type = FormTextFieldType.Secret,
    IsRequired = true
}

// Dropdown
new FormSelectField
{
    Name = "Model",
    Label = "Model",
    Options = [
        new("gpt-4", "GPT-4"),
        new("gpt-3.5", "GPT-3.5")
    ],
    DefaultValue = "gpt-4"
}
```

---

## 9. Action System Deep Dive

### Action Types

| Timing | Trigger | Use Case |
|--------|---------|----------|
| `FunctionTiming.AfterUserMessage` | After user speaks | User commands, queries |
| `FunctionTiming.AfterCharacterMessage` | After AI speaks | Character behaviors |
| `FunctionTiming.BeforeCharacterMessage` | Before AI responds | Pre-processing |

### Action Definition Fields

```csharp
new ScenarioActionDefinition
{
    // Required
    Name = "action_name",           // Unique identifier
    Description = "When to trigger", // AI instruction

    // Optional - Categorization
    Layer = "my_layer",             // Group related actions
    ShortDescription = "brief",     // For UI/lists

    // Optional - Filtering
    MatchFilter = ["regex1", "regex2"], // Only trigger if match
    AssistantFilter = true,         // Only for assistant chars

    // Optional - Behavior
    Timing = FunctionTiming.AfterUserMessage,
    CancelReply = false,            // Suppress AI response

    // Optional - Effects
    Effect = new ActionEffect
    {
        Secret = "Hidden context",  // Added to AI context
        Text = "Visible text",      // Added to response
    },

    // Optional - Arguments
    Arguments = [
        new FunctionArgumentDefinition
        {
            Name = "arg_name",
            Type = FunctionArgumentType.String, // String, Number, Boolean
            Required = true,
            Description = "What this argument is"
        }
    ]
}
```

### Template Variables

Use in `Description`, `Effect.Secret`, `Effect.Text`:

| Variable | Description |
|----------|-------------|
| `{{ char }}` | Character name |
| `{{ user }}` | User name |

### Handling Actions

```csharp
// Provider SDK
HandleMessage<ServerActionMessage>(msg =>
{
    if (msg.Layer != "my_layer") return;
    if (msg.Role != ChatMessageRole.User) return;

    if (msg.TryGetArgument("arg_name", out var value))
    {
        // Use value
    }
});

// Modules SDK (Augmentation)
public async ValueTask<bool> TryHandleActionInference(
    ChatMessageData? message,
    ServerActionMessage action,
    CancellationToken ct)
{
    if (action.ContextKey != "MyContext") return false;

    switch (action.Value)
    {
        case "my_action":
            await _session.SendSecretAsync("Info for AI", ct);
            await _session.TriggerReplyAsync(ct);
            return true;
    }
    return false;
}
```

---

## 10. Audio Handling

### Supported Formats

| Format | MIME Type | Notes |
|--------|-----------|-------|
| WAV | `audio/x-wav` | Recommended |
| MP3 | `audio/mpeg` | Requires decoder |

### Audio Output Capabilities

| Capability | Description |
|------------|-------------|
| `None` | No audio output |
| `Url` | Server provides URL to download |
| `LocalFile` | Server writes to local path |

### Audio Input Capabilities

| Capability | Description |
|------------|-------------|
| `None` | No audio input |
| `WebSocketStream` | Stream PCM via WebSocket |

### Playback Synchronization

```
┌─────────┐    replyStart     ┌─────────┐
│ Server  │ ───────────────► │ Client  │
└─────────┘                   └─────────┘
     │                             │
     │      replyChunk (text+audio)│
     │ ───────────────────────────►│
     │                             │ Download audio
     │                             │ Start playback
     │      speechPlaybackStart    │
     │ ◄───────────────────────────│
     │                             │
     │      replyChunk             │
     │ ───────────────────────────►│
     │                             │ Queue audio
     │                             │
     │      replyEnd               │
     │ ───────────────────────────►│
     │                             │ Finish queue
     │                             │ Play remaining
     │      speechPlaybackComplete │
     │ ◄───────────────────────────│
     │                             │
```

---

## 11. Common Patterns & Best Practices

### Structured Logging

```csharp
// Good - structured
_logger.LogInformation("Action {ActionName} triggered with {Strength}", name, strength);

// Bad - string interpolation
_logger.LogInformation($"Action {name} triggered with {strength}");
```

### Cancellation Token Propagation

```csharp
public async Task DoWorkAsync(CancellationToken ct)
{
    await SomeApiCallAsync(ct);
    ct.ThrowIfCancellationRequested();
    await AnotherCallAsync(ct);
}
```

### Async Disposal

```csharp
public class MyService : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await CleanupAsync();
        GC.SuppressFinalize(this);
    }
}
```

### Error Handling in Providers

```csharp
HandleMessage<ServerActionMessage>(msg =>
{
    try
    {
        ProcessAction(msg);
    }
    catch (Exception ex)
    {
        Logger.LogError(ex, "Failed to process action {Action}", msg.Value);
        // Optionally notify user
        Send(new ClientSendMessage
        {
            SessionId = SessionId,
            Text = "/note An error occurred processing the action."
        });
    }
});
```

### Context Key Naming

```
MyApp/Category/Specific
├── SmartHome/Lights/LivingRoom
├── SmartHome/Temperature/Current
├── Game/Player/Health
└── Game/World/Weather
```

### Avoiding Action Loops

```csharp
// When sending response after handling action
Send(new ClientSendMessage
{
    SessionId = SessionId,
    DoUserActionInference = false,  // IMPORTANT!
    DoCharacterActionInference = false,
    Text = "Response text"
});
```

---

## 12. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Authentication required" | No profile in Voxta | Create profile in Voxta UI first |
| Actions not triggering | Missing ActionInference service | Enable in Voxta settings |
| No audio playback | TTS service not configured | Configure TTS in Voxta |
| WebSocket connection fails | Wrong URL or port | Check `appsettings.json` |
| Module not loading | Wrong target framework | Use `net9.0` or `net10.0` |

### Debug Logging

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Debug",
      "Override": {
        "Voxta": "Debug",
        "Microsoft.AspNetCore.SignalR": "Debug"
      }
    }
  }
}
```

### Message Spy Tool

Use `Voxta.MessageSpy` to log all WebSocket messages:

```bash
dotnet run --project Voxta.MessageSpy
```

### Checking Service Status

After `chatStarted`, check `services` object:

```csharp
case ServerChatStartedMessage msg:
    if (msg.Services.TextToSpeech == null)
        Console.WriteLine("TTS disabled");
    if (msg.Services.SpeechToText == null)
        Console.WriteLine("STT disabled");
    if (msg.Services.ActionInference == null)
        Console.WriteLine("Actions disabled");
    break;
```

---

## Quick Reference Card

### Provider SDK Essentials

```csharp
// Inherit from ProviderBase
public class MyProvider : ProviderBase

// Override OnStartAsync to initialize
protected override async Task OnStartAsync()

// Send messages
Send(message);           // Immediate
SendWhenFree(message);   // When AI idle

// Handle messages
HandleMessage<T>(handler);
HandleMessage(role, timing, handler);

// Background tasks
StartBackgroundLoop(interval, action);
ConfigureAutoReply(delay, action);

// Check state
bool IsBusy { get; }
Guid SessionId { get; }
```

### Modules SDK Essentials

```csharp
// Implement IVoxtaModule
public class VoxtaModule : IVoxtaModule
public void Configure(IVoxtaModuleBuilder builder)

// Register service
builder.Register(new ServiceDefinition { ... });
builder.AddImageGenService<T>(serviceName);
builder.AddChatAugmentationsService<T>(serviceName);

// Service base
public class MyService : ServiceBase, IImageGenService
ModuleConfiguration.Get(field);
ModuleConfiguration.GetRequired(field);
```

### Client SDK Essentials

```csharp
// Create client
_clientFactory.Create(authMessage, tokenProvider);

// Connect
await client.ConnectAsync(ct);

// Handle messages
client.OnMessageReceived += (s, msg) => { ... };

// Send messages
client.Send(new ClientStartChatMessage { ... });
client.Send(new ClientSendMessage { ... });
client.Send(new ClientUpdateContextMessage { ... });
```

---

*Generated from Voxta SDK codebase analysis. For updates, check https://github.com/voxta-ai*
