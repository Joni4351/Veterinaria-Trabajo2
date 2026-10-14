using System.Linq.Expressions;

namespace VeterinariaAPI.Repositories
{
    public interface IRepository<T> where T : class
    {
        Task<List<T>> ObtenerTodosAsync();
        Task<List<T>> ObtenerFiltradosAsync(Expression<Func<T, bool>> predicado);
        IQueryable<T> Query();
        Task<T?> ObtenerPorIdAsync(int id);
        Task CrearAsync(T entidad);
        Task EliminarAsync(T entidad);
        Task GuardarCambiosAsync();
    }
}