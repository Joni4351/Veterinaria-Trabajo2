using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace VeterinariaAPI.Services;

public class SwaggerAuthorizationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        if (metadata.Any(x => x is IAuthorizeData) && !metadata.Any(x => x is IAllowAnonymous))
            operation.Security = [new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Id = "Bearer", Type = ReferenceType.SecurityScheme } }] = [] }];
    }
}
