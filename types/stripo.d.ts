declare global {
  interface Window {
    StripoEditorApi: {
      actionsApi: {
        compileEmail: (args: {
          minimize: boolean;
          utmEntity?: {
            utmSource: string;
            utmMedium: string;
            utmCampaign: string;
            utmContent: string;
            utmTerm: string;
          };
          mergeTags: Array<{
            category: string;
            entries: Array<{
              label: string;
              value: string;
            }>;
          }>;
          forceAmp: boolean;
          resetDataSavedFlag: boolean;
          disableLineHeightsReplace: boolean;
          callback: (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any,
            html: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ampHtml: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ampErrors: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            displayConditions: any,
          ) => void;
        }) => void;
        isAllDataSaved: () => boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        save: (callback: (error: any) => void) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getTemplateData: (
          callback: (data: { html: string; css: string }) => void,
        ) => void;
      };
    };
    UIEditor: {
      initEditor: (
        container: HTMLElement,
        config: {
          metadata: {
            emailId: string;
            username?: string;
            avatarUrl?: string;
          };
          html?: string;
          css?: string;
          locale?: string;
          forceRecreate?: boolean;
          onTokenRefreshRequest: (callback: (token: string) => void) => void;
          messageSettingsEnabled: boolean;
          conditionsEnabled: boolean;
          syncModulesEnabled: boolean;
          notifications: {
            info: (
              message: string,
              id: string,
              params: Record<string, unknown>,
            ) => void;
            error: (
              message: string,
              id: string,
              params: Record<string, unknown>,
            ) => void;
            warn: (
              message: string,
              id: string,
              params: Record<string, unknown>,
            ) => void;
            success: (
              message: string,
              id: string,
              params: Record<string, unknown>,
            ) => void;
          };
          mergeTags: Array<{
            category: string;
            entries: Array<{
              label: string;
              value: string;
            }>;
          }>;
          specialLinks?: Array<{
            category: string;
            entries: Array<{
              label: string;
              value: string;
            }>;
          }>;
          socialNetworks?: Array<{
            name: string;
            href: string;
          }>;
          mobileViewButtonSelector?: string;
          desktopViewButtonSelector?: string;
        },
      ) => void;
      removeEditor: () => void;
    };
    StripoExtensionsSDK?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }
}

export {};
